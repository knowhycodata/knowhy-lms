#!/bin/sh
set -e

echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Running database seed..."
# Seed script'i çalıştır
if [ -f "dist/prisma/seed.js" ]; then
  node dist/prisma/seed.js || echo "⚠️ Seed already applied or skipped"
else
  echo "⚠️ Seed file not found, skipping..."
fi

echo "🚀 Starting the application..."
exec npm start
