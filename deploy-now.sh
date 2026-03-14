#!/bin/bash
# FileHub - Deploy script
# Run this once from your terminal to push all pending changes

echo "🚀 FileHub Deploy Script"
echo "========================"

# Check if we're in the right repo
if [ ! -f "package.json" ]; then
  echo "❌ Run this from the FILEHUB-IA folder"
  exit 1
fi

echo "📦 Current commit: $(git log --oneline -1)"
echo "🔗 Remote: $(git remote get-url origin)"
echo ""

# Push to main (Vercel auto-deploys)
echo "⬆️  Pushing to main (Vercel)..."
git push origin main

if [ $? -eq 0 ]; then
  echo "✅ Vercel deploy triggered!"
  echo "🌐 https://filehub-ia-pi.vercel.app"
else
  echo "❌ Push failed - check your credentials"
fi

echo ""
echo "Done! GitHub Actions will also build GitHub Pages automatically."
echo "🌐 https://ramongalera22-ai.github.io/FILEHUB-IA/"
