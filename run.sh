#!/usr/bin/env bashio
set -e

export MONGO_URL="mongodb://smart_reminder_db:27017/smart_reminders"

export HA_URL="${HA_URL:-http://supervisor/core}"
export HA_TOKEN="${HA_TOKEN:-${SUPERVISOR_TOKEN}}"

if [ -z "$HA_TOKEN" ]; then
  bashio::log.warning "SUPERVISOR_TOKEN not set, HA_TOKEN may be empty"
fi

if bashio::config.exists 'openrouter_api_key' 2>/dev/null; then
  export OPENROUTER_API_KEY=$(bashio::config 'openrouter_api_key')
  export OPENROUTER_MODEL=$(bashio::config 'openrouter_model')
  export OPENROUTER_MAX_TOKENS=$(bashio::config 'openrouter_max_tokens')
  export OPENROUTER_TEMPERATURE=$(bashio::config 'openrouter_temperature')
  export OPENROUTER_CACHE_CONTROL_TYPE=$(bashio::config 'openrouter_cache_control_type')
  export OPENROUTER_CACHE_CONTROL_TTL=$(bashio::config 'openrouter_cache_control_ttl')
  export OPENROUTER_SITE_URL=$(bashio::config 'openrouter_site_url')
  export OPENROUTER_SITE_NAME=$(bashio::config 'openrouter_site_name')
else
  bashio::log.info "Not running as HA Add-on, using environment variables"
fi

bashio::log.info "Starting Smart Reminders..."
exec node /usr/src/app/dist/index.js
