#!/bin/bash
# Fix the wrong Supabase URL in NucBox filehubdef vercel.json
# The URL ztigttazrdzkpxrzyast.supabase.co does NOT exist
# The correct URL is xlbtwjxyphqnjeugfxds.supabase.co

VERCEL_JSON="$HOME/.openclaw/workspace/filehubdef/vercel.json"

if [ -f "$VERCEL_JSON" ]; then
  if grep -q "ztigttazrdzkpxrzyast" "$VERCEL_JSON"; then
    sed -i 's/ztigttazrdzkpxrzyast/xlbtwjxyphqnjeugfxds/g' "$VERCEL_JSON"
    echo "✅ vercel.json fixed: ztigttazrdzkpxrzyast → xlbtwjxyphqnjeugfxds"
  else
    echo "✅ vercel.json already has correct URL"
  fi
else
  echo "⚠️ vercel.json not found at $VERCEL_JSON"
fi

# Also restart the pisos API server
pkill -f pisos-api-server 2>/dev/null
sleep 2
nohup /usr/bin/python3 ~/pisos-api-server.py > /tmp/pisos-api.log 2>&1 &
echo "✅ Pisos API server restarted on port 3001"
