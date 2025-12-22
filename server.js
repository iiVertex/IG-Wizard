const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static files from 'docs' folder
app.use(express.static(path.join(__dirname, 'docs')));

// Also serve the root files if needed (like images if they are referenced relatively)
// But based on workspace, images are in docs/images.
// The HTML references ./images/logo.png, so serving docs as root is correct.

// API endpoint
app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
        console.error('API Key missing in .env');
        return res.status(500).json({ error: 'API key not configured' });
    }

    try {
        const { messages } = req.body;
        console.log('Sending request to Mistral...');

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "mistral-tiny",
                messages: messages
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Mistral API Error:', data);
            return res.status(response.status).json(data);
        }

        console.log('Success!');
        res.json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT}/aiassistant.html to test`);
});
