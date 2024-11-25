# Use the official Node.js 18 image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the rest of the application code
# COPY . . # if project is located locally
ADD "https://www.random.org/cgi-bin/randbyte?nbytes=10&format=h" /home/skipcache
RUN git clone https://github.com/anarchy-16/engine .
#RUN git checkout dev

# Install dependencies
RUN npm install

# Expose port 1616 (optional for demonstration, but not necessary for Telegram bot)
EXPOSE 1616

# Start the bot
CMD ["node", "bot.js"]