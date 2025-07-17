#!/bin/bash

msg=${1:-"Deploy: UI update"}

echo "🔁 Committing + pushing UI..."
git add .
git commit -m "$msg"
git push

echo "🚀 Deploying UI on server..."
ssh -p 2222 bravico@bravico.from-ma.com << 'EOF'
cd ~/EFacture.UI
git pull
cd ~/EFacture.API
sudo docker compose build frontend
sudo docker compose up -d frontend
EOF

echo "✅ UI deployed!"
