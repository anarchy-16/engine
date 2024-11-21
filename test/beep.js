require('dotenv').config();
const { notify } = require('../notification');

async function testBeepMessage() {
    try {
        await notify("_beep beep_");
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Run the test
testBeepMessage();
