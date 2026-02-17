#!/usr/bin/env bashio

export MONGO_URL="mongodb://smart_reminder_db:27017/smart_reminders"

HA_URL="${HA_URL:-http://supervisor/core}"
HA_TOKEN="${HA_TOKEN:-${SUPERVISOR_TOKEN}}"

export HA_URL
export HA_TOKEN

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
  export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
  export OPENROUTER_MODEL="${OPENROUTER_MODEL:-google/gemini-3-flash-preview}"
  export OPENROUTER_MAX_TOKENS="${OPENROUTER_MAX_TOKENS:-2400}"
  export OPENROUTER_TEMPERATURE="${OPENROUTER_TEMPERATURE:-0.2}"
fi

bashio::log.info "Starting Smart Reminders with HA at ${HA_URL}"
exec node /usr/src/app/dist/index.js
