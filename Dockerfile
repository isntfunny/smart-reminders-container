ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.18
FROM $BUILD_FROM

LABEL io.hass.version="0.1.0" io.hass.type="addon" io.hass.arch="aarch64|amd64|armhf|armv7|i386"

ENV LANG=C.UTF-8

# Install Node.js, MongoDB and other dependencies
RUN apk add --no-cache nodejs npm curl bash jq

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDeps for TypeScript)
RUN npm ci

# Copy source code and build
COPY src ./src
COPY views ./views
COPY public ./public
RUN npm run build

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
