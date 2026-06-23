#!/bin/bash

# Thiết lập PATH để tìm python3
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH

cd /app

if [ -f /app/.env ]; then
    set -a
    source /app/.env
    set +a
    echo "🔧 Loaded environment from .env file"
    echo "XMP_CLIENT_ID: ${XMP_CLIENT_ID:0:10}..."
    echo "XMP_CLIENT_SECRET: ${XMP_CLIENT_SECRET:+***}"
fi

exec "$@"