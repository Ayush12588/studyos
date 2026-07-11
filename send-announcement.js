/**
 * scripts/send-announcement.js
 * Manual, one-off feature-announcement email. NOT a cron job — you run this
 * yourself each time you ship something worth telling users about.
 *
 * Usage:
 *   node scripts/send-announcement.js --dryRun
 *   node scripts/send-announcement.js --testEmail=you@example.com
 *   node scripts/send-announcement.js --live
 *
 * Edit ANNOUNCEMENT below for each launch, then run dryRun first,
 * then testEmail against your own inbox, then --live.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---- EDIT THIS PER LAUNCH ----
const ANNOUNCEMENT = {
    subject: 'New on BoardOS: Circles are here',
    heading: 'Study with your friends now',
    body: `We just shipped Circles — small friend groups where you can see
    each other's progress and climb a shared leaderboard together.`,
    ctaText: 'Try Circles',
    ctaPath: '/circles'
};
// -------------------------------

function buildAnnouncementHtml({ name, appUrl }) {
    return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <p>Hi ${name || 'there'},</p>
      <h2 style="margin: 16px 0 8px;">${ANNOUNCEMENT.heading}</h2>
      <p style="color: #444; line-height: 1.5;">${ANNOUNCEMENT.body}</p>
      <a href="${appUrl}${ANNOUNCEMENT.ctaPath}"
         style="display:inline-block; margin-top:16px; padding:10px 20px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:6px;">
        ${ANNOUNCEMENT.ctaText}
      </a>
      <p style="margin-top:24px; font-size:12px; color:#999;">
        You're getting this because you have feature updates enabled on BoardOS.
      </p>
    </div>`;
}

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

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dryRun');
    const live = args.includes('--live');
    const testEmailArg = args.find(a => a.startsWith('--testEmail='));
    const testEmail = testEmailArg ? testEmailArg.split('=')[1].toLowerCase().trim() : null;

    if (!dryRun && !live && !testEmail) {
        console.error('Specify one of: --dryRun, --testEmail=x@y.com, --live');
        process.exit(1);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://boardos.in';

    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('user_id, name, notify_announcements')
        .eq('notify_announcements', true);

    if (error) throw error;

    let sent = 0, failed = 0;
    const failures = [];

    for (const profile of profiles) {
        try {
            const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
            if (userErr || !userData?.user?.email) continue;
            const userEmail = userData.user.email;

            if (testEmail && userEmail.toLowerCase() !== testEmail) continue;

            const html = buildAnnouncementHtml({ name: profile.name, appUrl });

            if (dryRun) {
                console.log(`[DRY RUN] Would send to ${userEmail}`);
                sent++;
                continue;
            }

            await sendEmailViaResend(userEmail, ANNOUNCEMENT.subject, html);
            console.log(`Sent to ${userEmail}`);
            sent++;

            if (testEmail) break;

            // Basic pacing: avoid hammering Resend on larger lists.
            await new Promise(r => setTimeout(r, 250));
        } catch (err) {
            failed++;
            failures.push({ user_id: profile.user_id, error: err.message });
        }
    }

    console.log(JSON.stringify({ sent, failed, failures }, null, 2));
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});