#!/bin/bash
# Wrapper script để chạy Python với .env file

cd /app

# Source .env file without using export with xargs (vì có JSON với special characters)
set -a
source /app/.env
set +a

/usr/local/bin/python "$@"