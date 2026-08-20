#!/bin/sh
set -e
alembic upgrade head
python -m scripts.seed_verbs
python -m scripts.seed_past_simple
python -m scripts.seed_present_simple
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
