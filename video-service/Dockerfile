# Use official Puppeteer image (includes Chrome & deps)
FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install system packages
USER root

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Switch back to 'pptruser' (default non-root user in this image)
USER pptruser

# Set working directory
WORKDIR /app

# Copy package files (with correct ownership)
COPY --chown=pptruser:pptruser package*.json ./

# Install dependencies
RUN npm install

# Copy source code (with correct ownership)
COPY --chown=pptruser:pptruser . .

# Environment Variables
ENV PORT=8080
EXPOSE 8080

# Start command
CMD ["node", "server.js"]
