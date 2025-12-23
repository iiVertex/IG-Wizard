module.exports = async function handler(req, res) {
  console.log('Vercel Function: Received request to /api/chat');

  // Allow GET requests for health check
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'API is working', message: 'Send a POST request to chat' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    console.error('Vercel Function: API Key missing in environment variables');
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        console.error('Vercel Function: Invalid messages format');
        return res.status(400).json({ error: 'Invalid messages format' });
    }

    console.log('Vercel Function: Sending request to Mistral API...');

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Vercel Function: Mistral API Error:', data);
      return res.status(response.status).json(data);
    }

    console.log('Vercel Function: Mistral API Success');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Vercel Function Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
