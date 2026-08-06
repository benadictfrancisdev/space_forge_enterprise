#!/bin/sh
set -e

echo "Waiting for database..."
python scripts/wait_for_db.py

echo "Waiting for Redis..."
python scripts/wait_for_redis.py

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Seeding platform defaults..."
python manage.py seed_platform || true

# Emit an immediate worker heartbeat when API boots (beat may lag).
python -c "import django; django.setup(); from workers.tasks import worker_heartbeat; worker_heartbeat()" 2>/dev/null || true

exec "$@"
