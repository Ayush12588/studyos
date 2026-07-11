/**
 * api/send-announcement.js
 * Manual-trigger feature-announcement email. NOT on a cron schedule —
 * you curl this yourself each time you ship something worth telling
 * users about. Runs as a Vercel serverless function (like send-reminders.js
 * and send-winback.js) specifically so it can use Vercel's env vars
 * directly, instead of requiring local credential setup like the
 * original standalone-script version did.
 *
 * Usage:
 *   curl ".../api/send-announcement?dryRun=true"
 *   curl ".../api/send-announcement?testEmail=you@example.com"
 *   curl ".../api/send-announcement?live=true"
 *
 * Edit ANNOUNCEMENT below for each launch before triggering.
 * Requires the same CRON_SECRET bearer auth as the other two routes —
 * this endpoint can email your entire user base at once, so it's
 * higher-stakes than the per-user-eligibility routes and should never
 * be left unauthenticated.
 */

import { createClient } from '@supabase/supabase-js';
import { buildAnnouncementEmail } from '../emails/announcement-template.js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- EDIT THIS PER LAUNCH ----
const ANNOUNCEMENT = {
    subject: 'New on BoardOS: Circles are here',
    heading: 'Study with your friends now',
    body: `We just shipped Circles — small friend groups where you can see each other's progress and climb a shared leaderboard together.`,
    ctaText: 'Try Circles'
    // No ctaPath: Circles has no direct deep link, CTA goes to appUrl root.
};
// -------------------------------

async function sendEmailViaResend(to, subject, html) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({ from: 'BoardOS <hello@boardos.in>', to, subject, html })
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

    const dryRun = req.query.dryRun === 'true';
    const live = req.query.live === 'true';
    const testEmail = req.query.testEmail ? String(req.query.testEmail).toLowerCase().trim() : null;

    if (!dryRun && !live && !testEmail) {
        return res.status(400).json({
            error: 'Specify one of: dryRun=true, testEmail=x@y.com, live=true'
        });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://boardos.in';

    let sent = 0, failed = 0;
    const failures = [];
    const dryRunDetails = [];

    try {
        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('user_id, name, notify_announcements')
            .eq('notify_announcements', true);

        if (error) throw error;

        for (const profile of profiles) {
            try {
                const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
                if (userErr || !userData?.user?.email) continue;
                const userEmail = userData.user.email;

                if (testEmail && userEmail.toLowerCase() !== testEmail) continue;

                const html = buildAnnouncementEmail({ name: profile.name, announcement: ANNOUNCEMENT, appUrl });

                if (dryRun) {
                    dryRunDetails.push({ user_id: profile.user_id, email: userEmail, subject: ANNOUNCEMENT.subject });
                    sent++;
                    if (testEmail) break;
                    continue;
                }

                await sendEmailViaResend(userEmail, ANNOUNCEMENT.subject, html);
                sent++;

                if (testEmail) break;
            } catch (perUserErr) {
                failed++;
                failures.push({ user_id: profile.user_id, error: perUserErr.message });
            }
        }

        if (testEmail && sent === 0 && failed === 0) {
            return res.status(404).json({
                error: `No enabled user found matching testEmail=${testEmail}`,
                hint: 'Check that notify_announcements=true on that profile and the auth email matches exactly.'
            });
        }

        return res.status(200).json({
            dryRun,
            testEmail: testEmail || null,
            sent,
            failed,
            failures: failures.slice(0, 10),
            ...(dryRun ? { details: dryRunDetails } : {})
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}