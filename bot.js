require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');
const { concatenateRepoContent } = require('./githubUtils');
const { processFunctions } = require('./functions');

// Replace the single token constants with an AI configurations array
const AI_CONFIGS = [
    {
        username: '@aether_a16bot',
        openai_token: process.env.AETHER_OPENAI_API_KEY,
        telegram_token: process.env.AETHER_TELEGRAM_BOT_TOKEN,
        prompt: 'You are Aether.',
    },
    {
        username: '@eve_a16bot',
        openai_token: process.env.EVE_OPENAI_API_KEY,
        telegram_token: process.env.EVE_TELEGRAM_BOT_TOKEN,
        prompt: 'You are Eve.',
    },
    {
        username: '@aat_a16bot',
        openai_token: process.env.AAT_OPENAI_API_KEY,
        telegram_token: process.env.AAT_TELEGRAM_BOT_TOKEN,
        prompt: 'You are Aat.',
    },
];

// Remove the old token constants and update TELEGRAM_API_URL to be a function
function getTelegramApiUrl(botToken) {
    return `https://api.telegram.org/bot${botToken}`;
}

const HISTORY_FILE = 'history.json';
const lastUpdateIds = {};
const ARCHIVE_REPO_URL = process.env.ARCHIVE_REPO_URL;

// Path to clone the GitHub repository
const localDirectory = path.join(__dirname, 'cloned-repo');

// Initialize a global variable to store GitHub content
let systemMessageContent = '';

async function initializeSystemMessage() {
    console.log('Fetching repository content...');
    systemMessageContent = await concatenateRepoContent(ARCHIVE_REPO_URL, localDirectory);
    console.log('Repository content fetched and concatenated.');
}

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

function buildHistoryAsString(chatId) {
    return conversationHistories[chatId].map(message => `${message.role}: ${message.content}`).join('\n');
}

function buildHistoryMessage(chatId) {
    return { role: 'user', content: 'THE CHAT ROOM HISTORY:\n\n' + buildHistoryAsString(chatId) };
}

// Function to get ChatGPT response
async function getChatGPTResponse(chatId, userMessage, aiConfig) {
    // Initialize conversation history if not already present
    if (!conversationHistories[chatId]) {
        conversationHistories[chatId] = [];
    }

    // Add user message to conversation history
    conversationHistories[chatId].push({ role: 'user', content: userMessage });

    // Define the system message
    const systemMessage = { role: 'system', content: aiConfig.prompt + `You are responding in the chat room. In the answer it is mandatory to use username of the member you are responding to. In your answer provide the text message only Answer as you only. Do not answer for other members.\n\nSystem info: Current time: ${new Date().toLocaleString()}\n\n\nARCHIVE:\n\n` + systemMessageContent };

    // Make API request to ChatGPT with system message prepended
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aiConfig.openai_token}`, // Use config token
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [systemMessage, buildHistoryMessage(chatId)],
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
async function sendMessage(chatId, text, botToken) {
    await fetch(`${getTelegramApiUrl(botToken)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
}

// Add the group updates token to environment variables
const GROUP_UPDATES_TOKEN = process.env.GROUP_UPDATES_TELEGRAM_BOT_TOKEN;

// Add queue management at the top level
const messageQueues = new Map(); // Map of chatId -> Array of {message, aiConfig} objects

// New function to process a single chat's queue
async function processQueue(chatId) {
    const queue = messageQueues.get(chatId);
    if (!queue || queue.length === 0) return;

    const { message, aiConfig } = queue.shift();
    console.log(`Processing queued message for ${aiConfig.username}: ${message}`);
    
    try {
        const botResponse = await getChatGPTResponse(chatId, message, aiConfig);
        console.log(`ChatGPT response: ${botResponse}`);

        // Check if response contains JSON
        const hasJson = botResponse.match(/\{.*\}/s);
        
        // Process any function calls in the bot's response
        if (hasJson) {
            await processFunctions(botResponse, aiConfig.username);
        } else {
            // Only send message to Telegram if there's no JSON function call
            await sendMessage(chatId, botResponse, aiConfig.telegram_token);
        }

        // Check bot's response for mentions
        const mentions = botResponse.match(/@\w+_a16bot/g) || [];
        for (const mention of mentions) {
            const mentionedConfig = AI_CONFIGS.find(config => config.username === mention);
            if (mentionedConfig) {
                messageQueues.get(chatId).push({
                    message: botResponse,
                    aiConfig: mentionedConfig
                });
                console.log(`Added bot's response to queue for ${mentionedConfig.username}`);
            }
        }
        
        // Log updated queue after processing response
        logQueue(chatId);
    } catch (error) {
        console.error(`Error processing queue item for ${aiConfig.username}:`, error);
    }
}

// Add this helper function near the other utility functions
function logQueue(chatId) {
    const queue = messageQueues.get(chatId) || [];
    console.log('\nCurrent Queue for Chat', chatId);
    console.log('------------------------');
    if (queue.length === 0) {
        console.log('Empty queue');
    } else {
        queue.forEach((item, index) => {
            console.log(`${index + 1}. Bot: ${item.aiConfig.username}, Message: ${item.message}`);
        });
    }
    console.log('------------------------\n');
}

// Separate function to continuously process queues
async function startQueueProcessor() {
    while (true) {
        // Process queues for all chats
        for (const [chatId, queue] of messageQueues) {
            await processQueue(chatId);
        }
        // Small delay to prevent CPU overload
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Modified processUpdates to only gather messages and update queues
async function processUpdates() {
    try {
        console.log('Processing updates...');

        // Initialize lastUpdateId if it doesn't exist
        if (!lastUpdateIds['group_updates']) {
            lastUpdateIds['group_updates'] = 0;
        }

        const response = await fetch(
            `${getTelegramApiUrl(GROUP_UPDATES_TOKEN)}/getUpdates?offset=${lastUpdateIds['group_updates'] + 1}&timeout=30`
        );
        const data = await response.json();

        if (!data.ok) {
            console.error('Error getting updates:', data.description);
            return;
        }

        if (!Array.isArray(data.result)) {
            console.warn('No updates available');
            return;
        }

        for (const update of data.result) {
            lastUpdateIds['group_updates'] = update.update_id;
            const message = update.message || update.channel_post;
            
            if (message && message.text) {
                const chatId = message.chat.id;
                const userMessage = message.text;

                // Initialize conversation history and queue as before
                if (!conversationHistories[chatId]) {
                    conversationHistories[chatId] = [];
                }
                conversationHistories[chatId].push({ role: 'user', content: userMessage });
                saveHistory();

                if (!messageQueues.has(chatId)) {
                    messageQueues.set(chatId, []);
                }

                // Find all bot mentions in order of appearance
                const mentions = userMessage.match(/@\w+_a16bot/g) || [];
                
                // Add to queue in order of mentions
                for (const mention of mentions) {
                    const aiConfig = AI_CONFIGS.find(config => config.username === mention);
                    if (aiConfig) {
                        messageQueues.get(chatId).push({
                            message: userMessage,
                            aiConfig: aiConfig
                        });
                        console.log(`Added message to queue for ${aiConfig.username}`);
                    }
                }
                
                logQueue(chatId);
            }
        }
    } catch (error) {
        console.error('Error processing updates:', error);
    }
}

// Update the startBot function to run both processes
async function startBot() {
    console.log('Initializing system message...');
    await initializeSystemMessage();

    console.log('Bot is running...');
    
    // Start both processes
    Promise.all([
        // Message gathering process
        (async () => {
            while (true) {
                await processUpdates();
            }
        })(),
        // Queue processing
        startQueueProcessor()
    ]).catch(error => {
        console.error('Error in main processes:', error);
    });
}

startBot();
