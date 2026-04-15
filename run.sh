#!/usr/bin/env bashio
set -e

HA_URL="${HA_URL:-http://supervisor/core}"

# s6-overlay stores env vars as files; bashio does not forward them to exec'd
# subprocesses, so we read SUPERVISOR_TOKEN directly from the filesystem.
S6_ENV_DIR="/run/s6/container_environment"
if [ -z "${SUPERVISOR_TOKEN:-}" ] && [ -f "${S6_ENV_DIR}/SUPERVISOR_TOKEN" ]; then
  SUPERVISOR_TOKEN="$(cat "${S6_ENV_DIR}/SUPERVISOR_TOKEN")"
fi
export SUPERVISOR_TOKEN

HA_TOKEN="${HA_TOKEN:-${SUPERVISOR_TOKEN:-}}"
export HA_URL HA_TOKEN

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
  export OPENROUTER_MODEL="${OPENROUTER_MODEL:-google/gemini-3-flash-preview}"
  export OPENROUTER_MAX_TOKENS="${OPENROUTER_MAX_TOKENS:-2400}"
  export OPENROUTER_TEMPERATURE="${OPENROUTER_TEMPERATURE:-0.2}"
fi

EXTERNAL_MONGO=""
if bashio::config.exists 'mongo_url' 2>/dev/null; then
  CFG_MONGO=$(bashio::config 'mongo_url')
  if [ -n "$CFG_MONGO" ] && [ "$CFG_MONGO" != "null" ]; then
    EXTERNAL_MONGO="$CFG_MONGO"
  fi
fi

if [ -n "$EXTERNAL_MONGO" ]; then
  export MONGO_URL="$EXTERNAL_MONGO"
  bashio::log.info "Using external MongoDB"
else
  export MONGO_URL="mongodb://127.0.0.1:27017/smart_reminders"
  bashio::log.info "Starting embedded MongoDB 8.0 (dbpath=/data/db)"
  mkdir -p /data/db
  mongod \
    --dbpath /data/db \
    --bind_ip 127.0.0.1 \
    --port 27017 \
    --logpath /data/mongod.log \
    --fork

  for i in $(seq 1 30); do
    if mongosh --quiet --eval 'db.adminCommand("ping").ok' "mongodb://127.0.0.1:27017" >/dev/null 2>&1; then
      bashio::log.info "MongoDB is ready"
      break
    fi
    sleep 1
    if [ "$i" = "30" ]; then
      bashio::log.fatal "MongoDB failed to start within 30s"
      tail -n 50 /data/mongod.log || true
      exit 1
    fi
  done
fi

bashio::log.info "Starting Smart Reminders (HA=${HA_URL}, Model=${OPENROUTER_MODEL})"
exec node /usr/src/app/dist/index.js
