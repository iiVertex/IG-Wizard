const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from 'docs' folder
app.use(express.static(path.join(__dirname, 'docs')));

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
    console.log('Received request to /api/chat');
    
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
        console.error('API Key missing in .env');
        return res.status(500).json({ error: 'API key not configured on server' });
    }

    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            console.error('Invalid messages format');
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        console.log('Sending request to Mistral API...');

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

        console.log('Mistral API Success');
        res.json(data);
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// Start the server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Test the AI Assistant at http://localhost:${PORT}/aiassistant.html`);
    });
}

module.exports = app;
