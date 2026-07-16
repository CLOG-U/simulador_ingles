#!/bin/sh
set -e

alembic upgrade head
python -m scripts.seed_verbs
if [ -n "$ADMIN_USERNAME" ] && [ -n "$ADMIN_PASSWORD" ]; then
  python -m scripts.create_admin || true
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
