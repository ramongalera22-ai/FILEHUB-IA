#!/bin/bash
echo "🚀 Deploying FILEBASE 2.0 NASH..."
docker-compose up -d --build
echo "✅ Deployment complete! Access at http://<NAS_IP>:8080"
