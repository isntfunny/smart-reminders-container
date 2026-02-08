#!/usr/bin/env bashio
set -e

# Start MongoDB in background
bashio::log.info "Starting MongoDB..."
mkdir -p /data/db
mongod --dbpath /data/db --fork --logpath /var/log/mongodb.log

# Wait for MongoDB to be ready
bashio::log.info "Waiting for MongoDB to be ready..."
until mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1 || mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
  sleep 1
done
bashio::log.info "MongoDB is ready!"

# Export environment variables from add-on options
export MONGO_URL=$(bashio::config 'mongo_url')
export HA_URL=$(bashio::config 'ha_url')
export HA_TOKEN=$(bashio::config 'ha_token')
export OPENROUTER_API_KEY=$(bashio::config 'openrouter_api_key')
export OPENROUTER_MODEL=$(bashio::config 'openrouter_model')
export OPENROUTER_MAX_TOKENS=$(bashio::config 'openrouter_max_tokens')
export OPENROUTER_TEMPERATURE=$(bashio::config 'openrouter_temperature')
export OPENROUTER_CACHE_CONTROL_TYPE=$(bashio::config 'openrouter_cache_control_type')
export OPENROUTER_CACHE_CONTROL_TTL=$(bashio::config 'openrouter_cache_control_ttl')
export OPENROUTER_SITE_URL=$(bashio::config 'openrouter_site_url')
export OPENROUTER_SITE_NAME=$(bashio::config 'openrouter_site_name')

# Start the Node.js application
bashio::log.info "Starting Smart Reminders..."
exec node /usr/src/app/dist/index.js
