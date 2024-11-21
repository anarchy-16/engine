const message = require('./message');

const functions = {
    message,
};

async function processFunctions(text, botUsername) {
    try {
        // Try to find JSON in the text
        const jsonMatch = text.match(/\{.*\}/s);
        if (!jsonMatch) return null;

        const functionCall = JSON.parse(jsonMatch[0]);
        
        // Validate function call format
        if (!functionCall.function || !functions[functionCall.function]) {
            throw new Error(`Unknown or missing function: ${functionCall.function}`);
        }

        // Execute the function with provided arguments and bot username
        return await functions[functionCall.function]({ ...functionCall.args, botUsername });
    } catch (error) {
        console.error('Error processing function:', error);
        return null;
    }
}

module.exports = {
    processFunctions,
}; 