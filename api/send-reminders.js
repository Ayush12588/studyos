/**
 * api/send-reminders.js
 * Vercel Cron endpoint for sending daily study reminders.
 * Implements a scalable Strategy Pattern to handle different notification types
 * without risking notification fatigue.
 */

import { createClient } from '@supabase/supabase-js';
import { buildReminderEmail } from '../emails/reminder-template.js';
import { generateSubject } from '../emails/email-utils.js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ACTIVE_STATUSES = ['not_started', 'in_progress', 'done_shaky'];
const MARKS_AT_RISK_STATUSES = ['not_started', 'done_shaky'];

function todayISO() {
    const now = new Date();
    // Shift to IST (UTC+5:30) to match student's timeline
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
}

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

// STRATEGY ENGINE: Easily scale to future reminder types (streaks, weekly reports)
const REMINDER_STRATEGIES = {
    morning: {
        // Send if they have anything on their plate.
        shouldSend: (stats) => stats.total > 0,
        requiresMorningBaseline: false,
        updateSnapshot: true // Establishes the 'priorMarks' baseline for the rest of the day
    },
    evening: {
        // Send ONLY if no progress was made today (marks at risk didn't decrease)
        shouldSend: (stats, priorMarks) => stats.total > 0 && stats.marksAtRisk >= priorMarks,
        requiresMorningBaseline: true, // Prevents fatigue: Don't send if they never got the morning plan
        updateSnapshot: false
    },
    night: {
        // Same logical condition as evening, but visually framed as a logging reminder
        shouldSend: (stats, priorMarks) => stats.total > 0 && stats.marksAtRisk >= priorMarks,
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
            .select('user_id, name, email_notifications_enabled, last_reminder_sent_date, last_reminder_marks_at_risk')
            .eq('email_notifications_enabled', true);

        const { data: profiles, error: profileErr } = await profileQuery;
        if (profileErr) throw profileErr;

        for (const profile of profiles) {
            try {
                // If testEmail is set, resolve this profile's auth email FIRST
                // and skip everyone else outright — cheapest possible filter,
                // avoids wasted backlog_items queries for non-matching users.
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

                const { data: items, error: itemErr } = await supabaseAdmin
                    .from('backlog_items')
                    .select('id, subject, chapter, type, status, priority, board_marks, due_date, created_at')
                    .eq('user_id', profile.user_id)
                    .in('status', ACTIVE_STATUSES);

                if (itemErr) throw itemErr;

                const stats = computeStats(items);
                const priorMarks = profile.last_reminder_marks_at_risk || 0;

                // Evaluate condition via Strategy Engine.
                // testEmail bypasses shouldSend too — when you're testing you want
                // to see the email regardless of whether the "should we bother this
                // user" heuristic would normally suppress it.
                if (!testEmail && !strategy.shouldSend(stats, priorMarks)) {
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

                const subject = generateSubject({ marksAtRisk: stats.marksAtRisk, slot });

                if (dryRun) {
                    dryRunDetails.push({
                        user_id: profile.user_id,
                        email: userEmail,
                        subject,
                        total_active: stats.total,
                        marks_at_risk: stats.marksAtRisk
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
                            last_reminder_marks_at_risk: stats.marksAtRisk
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
                hint: 'Check that email_notifications_enabled=true on that profile and the auth email matches exactly.'
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