import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_ORIGINS = ['https://studyos-edu.vercel.app', 'http://localhost:3000', 'https://boardos.in'];

async function verifyToken(authHeader) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    console.log('[auth] header present:', !!authHeader);
    console.log('[auth] token extracted:', !!token);
    if (!token) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    console.log('[auth] supabase error:', error?.message ?? 'none');
    console.log('[auth] user found:', !!data?.user);
    console.log('[auth] SUPABASE_URL set:', !!process.env.SUPABASE_URL);
    console.log('[auth] SERVICE_KEY set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (error || !data?.user) return null;

    return data.user;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const origin = req.headers.origin || '';
    if (!ALLOWED_ORIGINS.includes(origin)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await verifyToken(req.headers.authorization);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages,
                max_tokens: 600,
                temperature: 0.7
            })
        });

        const data = await groqRes.json();
        if (data.error) return res.status(500).json({ error: data.error.message });

        const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not respond.';
        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}