require('dotenv').config();
const fetch = require('node-fetch');

/**
 * Sends a message to the configured Telegram channel
 * @param {string} message - The message to send
 * @returns {Promise<void>}
 */
async function notify(message) {
    const token = process.env.BEEP_TELEGRAM_BOT_TOKEN;
    const channelId = process.env.GROUP_CHANNEL_ID;
    
    if (!token || !channelId) {
        throw new Error('Missing required environment variables');
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: channelId,
                text: message,
                parse_mode: 'MarkdownV2'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Telegram API error: ${errorData.description}`);
        }
    } catch (error) {
        console.error('Failed to send notification:', error);
        throw error;
    }
}

module.exports = {
    notify
};