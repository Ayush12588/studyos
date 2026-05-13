export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Only allow requests from your own site
    const origin = req.headers.origin || '';
    const allowed = ['https://studyos-edu.vercel.app', 'http://localhost:3000'];
    if (!allowed.includes(origin)) {
        return res.status(403).json({ error: 'Forbidden' });
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
                model: 'llama-3.3-70b-versatile', // Larger model for better MCQ quality
                messages,
                max_tokens: 3500,
                temperature: 0.4  // Lower = more factually accurate
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
