/**
 * api/send-reminders.js
 * Vercel Cron endpoint for sending daily study reminders.
 *
 * REWRITE NOTE (2026-07-10): Previously read from `backlog_items`, which
 * requires a manual "add to backlog" action most users never take (confirmed:
 * only ~1/4 of engaged users had any backlog_items rows, including several
 * active-within-days users with zero). Now reads directly from `chapters`,
 * the table every user actually interacts with. Marks-at-risk / priority
 * framing is dropped since `chapters` has no board_marks or priority column —
 * see conversation notes for future work on deriving marks-at-risk from
 * subject weightage if that data becomes available.
 *
 * Status values on chapters use HYPHENS: 'not-started', 'in-progress',
 * 'completed', 'revised'. The old version used underscores and matched
 * nothing — this was a silent bug, not just a source-table problem.
 */

import { createClient } from '@supabase/supabase-js';
import { buildReminderEmail } from '../emails/reminder-template.js';
import { generateSubject } from '../emails/email-utils.js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Real values confirmed via Supabase audit, 2026-07-10.
const PENDING_STATUSES = ['not-started', 'in-progress'];

function todayISO() {
    const now = new Date();
    // Shift to IST (UTC+5:30) to match student's timeline
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
}

function computeStats(chapters) {
    const pending = chapters.filter(c => PENDING_STATUSES.includes(c.status));
    const notStarted = chapters.filter(c => c.status === 'not-started');
    const inProgress = chapters.filter(c => c.status === 'in-progress');
    const completed = chapters.filter(c => c.status === 'completed');
    const revised = chapters.filter(c => c.status === 'revised');

    // Deadline-aware: pending chapters whose deadline has passed or is within 2 days.
    const now = new Date();
    const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const urgent = pending.filter(c => c.deadline && new Date(c.deadline) <= soon);

    // "Up Next" list for the email body: urgent chapters first (by nearest deadline),
    // then remaining pending chapters with no deadline, so the list is never empty
    // just because a user hasn't set deadlines (most chapters won't have one).
    const urgentSorted = [...urgent].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const urgentIds = new Set(urgentSorted.map(c => c.id));
    const restPending = pending.filter(c => !urgentIds.has(c.id));
    const topItems = [...urgentSorted, ...restPending]
        .slice(0, 5)
        .map(c => ({
            subject: c.subjects?.name || 'General',
            name: c.name,
            deadline: c.deadline,
            isUrgent: urgentIds.has(c.id)
        }));

    return {
        pendingCount: pending.length,
        notStartedCount: notStarted.length,
        inProgressCount: inProgress.length,
        completedCount: completed.length,
        revisedCount: revised.length,
        urgentCount: urgent.length,
        topItems
    };
}

// STRATEGY ENGINE: Easily scale to future reminder types (streaks, weekly reports)
const REMINDER_STRATEGIES = {
    morning: {
        // Send if they have anything pending at all.
        shouldSend: (stats) => stats.pendingCount > 0,
        requiresMorningBaseline: false,
        updateSnapshot: true // Establishes the 'priorCompletedCount' baseline for the rest of the day
    },
    evening: {
        // Send ONLY if no chapters were completed today (completedCount didn't increase)
        shouldSend: (stats, priorCompleted) => stats.pendingCount > 0 && stats.completedCount <= priorCompleted,
        requiresMorningBaseline: true, // Prevents fatigue: Don't send if they never got the morning plan
        updateSnapshot: false
    },
    night: {
        // Same logical condition as evening, but visually framed as a logging reminder
        shouldSend: (stats, priorCompleted) => stats.pendingCount > 0 && stats.completedCount <= priorCompleted,
        requiresMorningBaseline: true,
        updateSnapshot: false
    }
};

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

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const validSlots = ['morning', 'evening', 'night'];
    const slot = validSlots.includes(req.query.slot) ? req.query.slot : 'morning';
    const strategy = REMINDER_STRATEGIES[slot];

    const dryRun = req.query.dryRun === 'true';
    // testEmail restricts the run to a single real user matched by email.
    // When set, this ALSO bypasses requiresMorningBaseline and the
    // updateSnapshot write, so repeated test sends never mutate real
    // scheduling state or pollute your own baseline tracking.
    const testEmail = req.query.testEmail ? String(req.query.testEmail).toLowerCase().trim() : null;

    const today = todayISO();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://boardos.in';

    let sent = 0, skipped = 0, failed = 0, wouldSend = 0;
    const failures = [];
    const dryRunDetails = [];

    try {
        let profileQuery = supabaseAdmin
            .from('profiles')
            .select('user_id, name, notify_reminders, last_reminder_sent_date, last_reminder_completed_count')
            .eq('notify_reminders', true);

        const { data: profiles, error: profileErr } = await profileQuery;
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

                // Anti-Fatigue Guard: Ensure follow-ups only send if morning baseline was set.
                // Bypassed entirely for testEmail runs — you should be able to fire an
                // "evening" test at 9am without first faking a morning send.
                const alreadySentToday = profile.last_reminder_sent_date === today;
                if (!testEmail && strategy.requiresMorningBaseline && !alreadySentToday) {
                    skipped++;
                    continue;
                }

                const { data: chapters, error: chErr } = await supabaseAdmin
                    .from('chapters')
                    .select('id, name, status, deadline, subjects(name)')
                    .eq('user_id', profile.user_id);

                if (chErr) throw chErr;

                const stats = computeStats(chapters || []);
                const priorCompleted = profile.last_reminder_completed_count || 0;

                // Evaluate condition via Strategy Engine.
                // testEmail bypasses shouldSend too — when you're testing you want
                // to see the email regardless of whether the "should we bother this
                // user" heuristic would normally suppress it.
                if (!testEmail && !strategy.shouldSend(stats, priorCompleted)) {
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

                const subject = generateSubject({ pendingCount: stats.pendingCount, urgentCount: stats.urgentCount, slot });

                if (dryRun) {
                    dryRunDetails.push({
                        user_id: profile.user_id,
                        email: userEmail,
                        subject,
                        pending: stats.pendingCount,
                        urgent: stats.urgentCount,
                        completed: stats.completedCount
                    });
                    wouldSend++;
                    if (testEmail) break; // found our one match, no need to keep scanning
                    continue;
                }

                const html = buildReminderEmail({
                    name: profile.name,
                    stats,
                    slot,
                    appUrl
                });

                await sendEmailViaResend(userEmail, subject, html);

                // Only update the database state if the strategy dictates it (Morning),
                // and NEVER when this is a testEmail run — a test send must not alter
                // real scheduling/fatigue-guard state for that user.
                if (!testEmail && strategy.updateSnapshot) {
                    await supabaseAdmin
                        .from('profiles')
                        .update({
                            last_reminder_sent_date: today,
                            last_reminder_completed_count: stats.completedCount
                        })
                        .eq('user_id', profile.user_id);
                }

                sent++;
                if (testEmail) break; // one real user only, stop scanning the rest
            } catch (perUserErr) {
                failed++;
                failures.push({ user_id: profile.user_id, error: perUserErr.message });
            }
        }

        if (testEmail && sent === 0 && wouldSend === 0 && failed === 0) {
            return res.status(404).json({
                error: `No enabled user found matching testEmail=${testEmail}`,
                hint: 'Check that notify_reminders=true on that profile and the auth email matches exactly.'
            });
        }

        return res.status(200).json({
            slot,
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