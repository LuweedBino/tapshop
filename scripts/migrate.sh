#!/bin/sh
# Applies database migrations during the build. Neon (via Vercel) provides a pooled
# DATABASE_URL and a direct DATABASE_URL_UNPOOLED; migrations need the direct one.
set -e
if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  DATABASE_URL="$DATABASE_URL_UNPOOLED" npx prisma migrate deploy
else
  npx prisma migrate deploy
fi
