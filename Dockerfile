ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.18
FROM $BUILD_FROM

# Install Node.js, MongoDB and other dependencies
RUN apk add --no-cache nodejs npm curl mongodb

# Create MongoDB data directory
RUN mkdir -p /data/db && chmod 755 /data/db

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY dist ./dist
COPY views ./views
COPY public ./public

# Copy start script
COPY run.sh /
RUN chmod a+x /run.sh

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail --silent --show-error http://127.0.0.1:3000/ || exit 1

# Start the app
CMD [ "/run.sh" ]
