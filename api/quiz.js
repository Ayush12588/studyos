import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_ORIGINS = ['https://studyos-edu.vercel.app', 'http://localhost:3000'];

async function verifyToken(authHeader) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
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
        const { system, userMessage } = req.body;

        if (!system || !userMessage) {
            return res.status(400).json({ error: 'Missing system or userMessage' });
        }

        const messages = [
            { role: 'system', content: system },
            { role: 'user', content: userMessage }
        ];

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                max_tokens: 3500,
                temperature: 0.4
            })
        });

        const data = await groqRes.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        const reply = data.choices?.[0]?.message?.content || '';
        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}