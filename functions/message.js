const { notify } = require('../notification');

async function message(args) {
    if (!args || !args.text) {
        throw new Error('Message function requires a text argument');
    }
    
    let message = args.botUsername + " says: " + args.text;

    await notify(message);
    return true;
}

module.exports = message; 