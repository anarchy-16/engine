# Use the official Node.js 18 image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 1616 (optional for demonstration, but not necessary for Telegram bot)
EXPOSE 1616

# Start the bot
CMD ["node", "bot.js"]
