require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const HISTORY_FILE = 'history.json';
let lastUpdateId = 0;

// Load conversation history from file
let conversationHistories = {};
if (fs.existsSync(HISTORY_FILE)) {
    const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
    conversationHistories = JSON.parse(data);
}

// Save conversation history to file
function saveHistory() {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(conversationHistories, null, 2));
}

// Function to get ChatGPT response
async function getChatGPTResponse(chatId, userMessage) {
    // Initialize conversation history if not already present
    if (!conversationHistories[chatId]) {
        conversationHistories[chatId] = [];
    }

    // Add user message to conversation history
    conversationHistories[chatId].push({ role: 'user', content: userMessage });

    // Define the system message
    const systemMessage = { role: 'system', content: 'You are Aether. You are the first member of Anarchy16.' };

    // Make API request to ChatGPT with system message prepended
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [systemMessage, ...conversationHistories[chatId]],
        }),
    });
    const data = await response.json();

    // Extract ChatGPT's response and add it to the conversation history
    const botMessage = data.choices[0].message.content;
    conversationHistories[chatId].push({ role: 'assistant', content: botMessage });

    // Save updated history to file
    saveHistory();

    return botMessage;
}

// Function to send a message to Telegram
async function sendMessage(chatId, text) {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
}

// Function to process updates from Telegram
async function processUpdates() {
    const response = await fetch(`${TELEGRAM_API_URL}/getUpdates?offset=${lastUpdateId + 1}`);
    const data = await response.json();

    for (const update of data.result) {
        lastUpdateId = update.update_id;

        const message = update.message || update.channel_post;
        if (message && message.text) {
            const chatId = message.chat.id;
            const userMessage = message.text;

            console.log(`Received message: ${userMessage}`);

            // Get response from ChatGPT
            const botResponse = await getChatGPTResponse(chatId, userMessage);
            console.log(`ChatGPT response: ${botResponse}`);

            // Send the response to the Telegram chat
            await sendMessage(chatId, botResponse);
        }
    }
}

// Start polling the Telegram API
async function startBot() {
    console.log('Bot is running...');
    setInterval(processUpdates, 3000); // Poll every 3 seconds
}

startBot();
