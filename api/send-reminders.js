import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// backlog_items.status values that count as "active" — mirrors
// backlog.js's isActive()/_activeItems(): everything except 'mastered'.
// Explicitly excludes 'snoozed' and 'dismissed' too — those are the user
// telling the app "not now" or "not this," and the email must respect that
// the same way the in-app UI does. Re-nagging about a snoozed item is worse
// than not sending at all; it directly contradicts a choice the user made.
const ACTIVE_STATUSES = ['not_started', 'in_progress', 'done_shaky'];

// A backlog item counts toward "marks at risk" only in these two states —
// exact same rule as backlog.js _stats(). in_progress is excluded from the
// marks calculation there (started work "removes" the risk framing even
// though the item is still active) — keep that nuance, don't flatten it.
const MARKS_AT_RISK_STATUSES = ['not_started', 'done_shaky'];

const TYPE_LABELS = {
    lecture_pending: 'lecture pending',
    revision_pending: 'revision pending',
    questions_pending: 'questions pending',
    chapter_unstarted: 'chapter not started',
};

function todayISO() {
    // Server runs in UTC; IST is UTC+5:30. Shift before taking the date part
    // so "today" matches what the student sees in-app.
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
}

// Mirrors backlog.js _stats() exactly — same field names, same filter logic.
// Keeping this identical to the client is deliberate: if this drifts from
// backlog.js, the email will disagree with what the user sees in the app,
// which is the exact trust-breaking bug we already caught once with
// chapters.deadline. Any future change to _stats() must be mirrored here.
function computeStats(items) {
    const active = items.filter(i => ACTIVE_STATUSES.includes(i.status));

    const marksAtRisk = active
        .filter(i => MARKS_AT_RISK_STATUSES.includes(i.status))
        .reduce((sum, i) => sum + (i.board_marks || 0), 0);

    const highPriorityCount = active.filter(i => i.priority === 'high').length;

    const byType = {};
    active.forEach(i => {
        byType[i.type] = (byType[i.type] || 0) + 1;
    });

    return { active, total: active.length, marksAtRisk, highPriorityCount, byType };
}

function buildEmailHtml({ name, stats, slot }) {
    const typeLines = Object.entries(stats.byType)
        .map(([type, count]) => `${count} ${TYPE_LABELS[type] || type}${count === 1 ? '' : 's'}`)
        .join(' &middot; ');

    const topItems = stats.active
        .sort((a, b) => (b.board_marks || 0) - (a.board_marks || 0))
        .slice(0, 5)
        .map(i => `<li style="margin-bottom:6px">${escapeHtml(i.chapter)} <span style="color:#888;font-size:12px">(${escapeHtml(i.subject)}${i.board_marks ? ` &middot; ${i.board_marks}M` : ''})</span></li>`)
        .join('');

    const heading = slot === 'evening'
        ? `Still pending: ${stats.marksAtRisk} marks at risk`
        : `${stats.marksAtRisk} marks at risk in your boards`;

    return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#111">
      <h2 style="margin-bottom:4px">${heading}</h2>
      <p style="color:#555;margin-top:0">Hi ${escapeHtml(name)},</p>
      <p style="color:#555">${stats.total} item${stats.total === 1 ? '' : 's'} in your backlog &mdash; ${typeLines}</p>
      <ul style="padding-left:20px">${topItems}</ul>
      <p style="margin-top:24px">
        <a href="https://boardos.in" style="background:#6366f1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">
          Open BoardOS
        </a>
      </p>
      <p style="color:#999;font-size:12px;margin-top:32px">
        Don't want these? Turn them off anytime in BoardOS &rarr; Settings.
      </p>
    </div>`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function sendEmail(to, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: 'BoardOS <reminders@boardos.in>',
            to,
            subject,
            html
        })
    });
    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Resend ${res.status}: ${errBody}`);
    }
}

export default async function handler(req, res) {
    // Auth: only Vercel Cron (or someone with the secret) may trigger this.
    // Dry runs still require the secret — this endpoint touches every user's
    // data, so it's not a "safe to leave open" case just because dryRun
    // skips the actual send.
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const slot = req.query.slot === 'evening' ? 'evening' : 'morning';
    const dryRun = req.query.dryRun === 'true';
    const today = todayISO();

    let sent = 0, skipped = 0, failed = 0;
    const failures = [];
    const dryRunDetails = [];

    try {
        const { data: profiles, error: profileErr } = await supabaseAdmin
            .from('profiles')
            .select('user_id, name, email_notifications_enabled, last_reminder_sent_date, last_reminder_marks_at_risk')
            .eq('email_notifications_enabled', true);

        if (profileErr) throw profileErr;

        for (const profile of profiles) {
            try {
                // Evening slot: only send if we already sent this user an
                // email earlier today — this is a "still pending" follow-up,
                // never a standalone send. See conversation history for why:
                // an independent evening check risks re-stating the same
                // content as the morning email in different words, which is
                // the exact wallpaper/fatigue problem we designed against.
                const alreadySentToday = profile.last_reminder_sent_date === today;
                if (slot === 'evening' && !alreadySentToday) {
                    skipped++;
                    continue;
                }

                const { data: items, error: itemErr } = await supabaseAdmin
                    .from('backlog_items')
                    .select('id, subject, chapter, type, status, priority, board_marks, due_date, created_at')
                    .eq('user_id', profile.user_id)
                    .in('status', ACTIVE_STATUSES);

                if (itemErr) throw itemErr;

                const stats = computeStats(items);

                // Stopping condition, exactly as originally requested: if
                // there's no active backlog at all, send nothing. This is
                // the ONE unconditional silence case — everything else below
                // is about whether TODAY specifically warrants a send.
                if (stats.total === 0) {
                    skipped++;
                    continue;
                }

                const priorMarksAtRisk = profile.last_reminder_marks_at_risk || 0;
                const marksGrew = stats.marksAtRisk > priorMarksAtRisk;
                const hasHighPriority = stats.highPriorityCount > 0;

                // Send if there's anything genuinely urgent (high priority —
                // which already factors in exam proximity via
                // computePriority() in backlog.js) OR the risk has grown
                // since last email. A static, unchanging LOW-priority
                // backlog does not warrant a daily email — that's the
                // wallpaper case we ruled out earlier, just reframed against
                // real fields instead of the old chapters-based ones.
                const shouldSend = hasHighPriority || marksGrew;

                if (!shouldSend) {
                    skipped++;
                    continue;
                }

                // Evening slot additionally requires the backlog to still be
                // unresolved in a way that matters — if urgency has since
                // dropped to none (they cleared the high-priority items
                // since morning), don't send a stale nudge.
                if (slot === 'evening' && !hasHighPriority && !marksGrew) {
                    skipped++;
                    continue;
                }

                const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
                if (userErr || !userData?.user?.email) {
                    skipped++;
                    continue;
                }

                const subject = slot === 'evening'
                    ? `Still pending: ${stats.marksAtRisk} marks at risk`
                    : `${stats.marksAtRisk} marks at risk in your boards`;

                if (dryRun) {
                    // No email, no DB write — just record what WOULD happen
                    // so a human can eyeball it against real data first.
                    dryRunDetails.push({
                        user_id: profile.user_id,
                        email: userData.user.email,
                        subject,
                        total_active: stats.total,
                        marks_at_risk: stats.marksAtRisk,
                        high_priority_count: stats.highPriorityCount,
                        by_type: stats.byType,
                        prior_marks_at_risk: priorMarksAtRisk
                    });
                    sent++;
                    continue;
                }

                const html = buildEmailHtml({ name: profile.name || 'Student', stats, slot });

                await sendEmail(userData.user.email, subject, html);

                await supabaseAdmin
                    .from('profiles')
                    .update({
                        last_reminder_sent_date: today,
                        last_reminder_marks_at_risk: stats.marksAtRisk
                    })
                    .eq('user_id', profile.user_id);

                sent++;
            } catch (perUserErr) {
                failed++;
                failures.push({ user_id: profile.user_id, error: perUserErr.message });
            }
        }

        return res.status(200).json({
            slot,
            dryRun,
            sent,
            skipped,
            failed,
            failures: failures.slice(0, 10),
            ...(dryRun ? { details: dryRunDetails } : {})
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}