#!/bin/bash
# Full stack startup script for Replit deployment

echo "🛡️ Starting Zyra Full Stack..."

# Kill any existing processes on ports 3000, 3001
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Build if needed
if [ ! -d "apps/web/.next" ] || [ ! -d "apps/api/dist" ]; then
  echo "Building..."
  npm run build
fi

# Start both services in foreground (required for Replit)
echo "Starting API (Fastify) on port 3001..."
node apps/api/dist/index.js &
API_PID=$!

echo "Starting Frontend (Next.js) on port 3000..."
npm run start:web &
WEB_PID=$!

# Wait for both
wait $API_PID $WEB_PID