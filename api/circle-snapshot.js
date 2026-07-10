/**
 * api/circle-snapshot.js
 * Vercel Cron endpoint for daily Study Circles leaderboard snapshots.
 * Writes one row per (user, circle, day) into circle_member_snapshots —
 * the historical data that powers rank-change arrows and overtake alerts.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { error } = await supabaseAdmin.rpc('snapshot_circle_leaderboards');
        if (error) throw error;

        return res.status(200).json({
            ok: true,
            snapshotted_at: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}