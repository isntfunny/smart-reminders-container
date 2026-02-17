#!/usr/bin/env bashio
set -e

# Set fixed MongoDB URL (external container)
export MONGO_URL="mongodb://mongo:27017/smart_reminders"

# Export environment variables from add-on options
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
