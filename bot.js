// bot.js

require('dotenv').config();
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

let lastUpdateId = 0;

async function getChatGPTResponse(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are Aether. You are the first member of Anarchy16.' },
                { role: 'user', content: prompt }
            ]
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function sendMessage(chatId, text) {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
    });
}

async function processUpdates() {
    const response = await fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${lastUpdateId + 1}`);
    const data = await response.json();

    for (const update of data.result) {
        lastUpdateId = update.update_id;
        
        const message = update.message;
        if (message && message.text) {
            const chatId = message.chat.id;
            const userMessage = message.text;

            console.log(`Received message: ${userMessage}`);

            // Get response from ChatGPT
            const botResponse = await getChatGPTResponse(userMessage);
            console.log(`ChatGPT response: ${botResponse}`);

            // Send the response to the Telegram chat
            await sendMessage(chatId, botResponse);
        }
    }
}

// Polling the Telegram API for updates
async function startBot() {
    console.log('Bot is running...');
    setInterval(processUpdates, 3000); // Poll every 3 seconds
}

startBot();
