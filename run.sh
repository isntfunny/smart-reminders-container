#!/usr/bin/env sh
set -e

# Start the Node.js application
echo "Starting Smart Reminders..."
exec node /usr/src/app/dist/index.js
