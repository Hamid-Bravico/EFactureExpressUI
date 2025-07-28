#!/bin/bash
# Exit immediately if any command fails.
set -e

msg=${1:-"Deploy: UI update"}

echo "🔁 Committing + pushing UI..."
git add .
git commit -m "$msg"
git push

echo "🚀 Deploying UI on server..."
ssh -p 2222 bravico@bravico.from-ma.com << 'EOF'
    # Also apply error checking on the remote server
    set -e

    echo "Pulling latest UI changes..."
    cd ~/projects/EFacture.UI
    git pull

    source ~/efacture.env
    # The docker-compose context for frontend is ../EFacture.UI
    echo "Rebuilding and restarting frontend container..."
    cd ~/projects/EFacture.API 
    docker compose up -d --build --force-recreate frontend

    echo "Cleaning up old docker images..."
    # Prune dangling images to save disk space
    docker image prune -f
EOF

echo "✅ UI deployed!"