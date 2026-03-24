# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port (server listens on 3001 by default)
EXPOSE 3001

# Start the server
CMD ["node", "src/server.js"]

# Build and run commands:
# docker build -t crewconnect-backend .
# docker run --env-file .env -p 3001:3001 --name crewconnect-backend crewconnect-backend
