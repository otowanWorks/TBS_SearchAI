// Vercelサーバーレス関数 - APIキー隠蔽用
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { utterance, uid } = req.body;

        if (!utterance || utterance.trim() === '') {
            return res.status(400).json({ error: 'utterance is required' });
        }

        const MEBO_API_KEY  = process.env.MEBO_API_KEY;
        const MEBO_AGENT_ID = process.env.MEBO_AGENT_ID;

        if (!MEBO_API_KEY || !MEBO_AGENT_ID) {
            console.error('Missing environment variables');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const response = await fetch('https://api-mebo.dev/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key:  MEBO_API_KEY,
                agent_id: MEBO_AGENT_ID,
                utterance: utterance.trim(),
                uid: uid || 'anonymous'
            })
        });

        if (!response.ok) {
            console.error('MEBO API error:', response.status);
            return res.status(500).json({ error: 'AI service temporarily unavailable' });
        }

        const content = await response.json();

        if (!content.bestResponse || !content.bestResponse.utterance) {
            console.error('Invalid response structure from MEBO API');
            return res.status(500).json({ error: 'Invalid response from AI service' });
        }

        return res.status(200).json({
            response: content.bestResponse.utterance,
            status: 'success'
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
