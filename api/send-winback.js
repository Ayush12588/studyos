/**
 * api/send-winback.js
 * Vercel Cron endpoint for a single day-3 win-back email.
 * Reads directly from `chapters` — does NOT depend on backlog_items,
 * since most engaged users never touch that subsystem (confirmed via
 * Supabase audit: 12/16 active users had zero backlog_items rows).
 *
 * Two segments, different copy:
 *   - new_unengaged: signed up 3+ days ago, zero chapter activity
 *   - lapsed:        had real chapter activity, gone quiet 3+ days
 *
 * One-shot per user: winback_sent_at is set after send and checked
 * before send, so nobody gets this twice. If you later want a repeating
 * series, this script needs a rework (currently intentionally single-fire).
 */

import { createClient } from '@supabase/supabase-js';
import { buildWinbackEmail } from '../emails/winback-template.js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOUCHED_STATUSES_EXCLUDE = 'not-started'; // status <> this counts as "touched"
const WINBACK_DAYS = 3;

async function sendEmailViaResend(to, subject, html) {
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

function daysAgo(n) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString();
}

// Rejects null/empty, single short lowercase tokens with no vowels/spacing
// pattern of a real name (e.g. "vvwhn"), and anything that looks like an
// email-address fragment. Not exhaustive — just filters the obvious junk.
function isPlausibleName(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (trimmed.length < 2) return false;
    if (/[@._]/.test(trimmed)) return false; // looks like an email/username fragment
    if (!/[aeiouAEIOU]/.test(trimmed)) return false; // no vowel at all — likely not a name
    return true;
}

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const dryRun = req.query.dryRun === 'true';
    const testEmail = req.query.testEmail ? String(req.query.testEmail).toLowerCase().trim() : null;
    const cutoff = daysAgo(WINBACK_DAYS);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://boardos.in';

    let sent = 0, skipped = 0, failed = 0, wouldSend = 0;
    const failures = [];
    const dryRunDetails = [];

    try {
        // Only candidates: opted in, never sent, signed up at least WINBACK_DAYS ago
        let query = supabaseAdmin
            .from('profiles')
            .select('user_id, name, notify_winback, winback_sent_at, created_at, last_study_date')
            .eq('notify_winback', true)
            .is('winback_sent_at', null)
            .lte('created_at', cutoff);

        const { data: profiles, error: profileErr } = await query;
        if (profileErr) throw profileErr;

        for (const profile of profiles) {
            try {
                let userEmail = null;
                if (testEmail) {
                    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
                    if (userErr || !userData?.user?.email) continue;
                    userEmail = userData.user.email;
                    if (userEmail.toLowerCase() !== testEmail) continue;
                }

                // Pull chapter activity for segmentation
                const { data: chapters, error: chErr } = await supabaseAdmin
                    .from('chapters')
                    .select('status, last_studied_date, task_touched_date, completion_date')
                    .eq('user_id', profile.user_id);

                if (chErr) throw chErr;

                const touchedChapters = (chapters || []).filter(c => c.status !== TOUCHED_STATUSES_EXCLUDE);
                const hasActivity = touchedChapters.length > 0 || Boolean(profile.last_study_date);

                // Most recent activity timestamp across chapter-level date fields
                // AND profiles.last_study_date. This matters: logging a daily
                // session (streak tracking) updates last_study_date directly and
                // does NOT touch any chapters row — confirmed via production bug
                // where a user studying daily (streak: 2, last_study_date:
                // yesterday) was misclassified as "lapsed" because every chapter
                // date field was 10 days stale. last_study_date is the more
                // authoritative signal for "did they use the app," not a fallback.
                const activityDates = (chapters || [])
                    .flatMap(c => [c.last_studied_date, c.task_touched_date, c.completion_date])
                    .concat(profile.last_study_date ? [profile.last_study_date] : [])
                    .filter(Boolean)
                    .sort()
                    .reverse();
                const lastActivity = activityDates[0] ? new Date(activityDates[0]) : null;

                let segment;
                if (!hasActivity) {
                    segment = 'new_unengaged';
                } else if (lastActivity && lastActivity <= new Date(cutoff)) {
                    segment = 'lapsed';
                } else {
                    // Has activity, but it's recent — not lapsed, skip.
                    // (e.g. signed up 3+ days ago but was active in the last 3 days)
                    skipped++;
                    continue;
                }

                if (!userEmail) {
                    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
                    if (userErr || !userData?.user?.email) {
                        skipped++;
                        continue;
                    }
                    userEmail = userData.user.email;
                }

                // Guard against low-quality name data (email fragments, single
                // lowercase tokens like "vvwhn") getting printed straight into
                // the subject line. Not a perfect name validator — just enough
                // to catch the obvious junk seen in a real dry-run audit.
                const displayName = isPlausibleName(profile.name) ? profile.name : 'Hey';

                const subject = segment === 'lapsed'
                    ? `${displayName}, your progress is still here`
                    : `${displayName}, here's what BoardOS actually does`;

                if (dryRun) {
                    dryRunDetails.push({
                        user_id: profile.user_id,
                        email: userEmail,
                        segment,
                        chapters_touched: touchedChapters.length,
                        subject
                    });
                    wouldSend++;
                    if (testEmail) break;
                    continue;
                }

                const html = buildWinbackEmail({
                    name: displayName === 'Hey' ? null : displayName,
                    segment,
                    chaptersTouched: touchedChapters.length,
                    appUrl
                });

                await sendEmailViaResend(userEmail, subject, html);

                if (!testEmail) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({ winback_sent_at: new Date().toISOString() })
                        .eq('user_id', profile.user_id);
                }

                sent++;
                if (testEmail) break;
            } catch (perUserErr) {
                failed++;
                failures.push({ user_id: profile.user_id, error: perUserErr.message });
            }
        }

        if (testEmail && sent === 0 && wouldSend === 0 && failed === 0) {
            return res.status(404).json({
                error: `No eligible user found matching testEmail=${testEmail}`,
                hint: 'Check notify_winback=true, winback_sent_at is null, and created_at is 3+ days ago.'
            });
        }

        return res.status(200).json({
            dryRun,
            testEmail: testEmail || null,
            sent,
            wouldSend,
            skipped,
            failed,
            failures: failures.slice(0, 10),
            ...(dryRun ? { details: dryRunDetails } : {})
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}