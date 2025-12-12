#!/bin/bash
set -e

# Copy database from container to volume if it doesn't exist or is older
if [ ! -f /data/gp_tracker.db ] || [ /app/gp_tracker.db -nt /data/gp_tracker.db ]; then
    echo "Syncing database to volume..."
    cp /app/gp_tracker.db /data/gp_tracker.db
    echo "Database synced."
fi

# Start gunicorn
exec gunicorn --bind 0.0.0.0:8080 app:app
