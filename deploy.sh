#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="root@62.238.3.136"

echo "→ Construyendo frontend..."
cd "$ROOT_DIR/frontend"
npm run build

echo "→ Sincronizando backend (sin tocar uploads)..."
rsync -az --delete \
  --exclude='uploads/' \
  --exclude='node_modules/' \
  --exclude='.env' \
  "$ROOT_DIR/backend/" $SERVER:/root/elys/backend/

echo "→ Sincronizando frontend dist..."
rsync -az --delete \
  "$ROOT_DIR/frontend/dist/" $SERVER:/root/elys/frontend/dist/

echo "→ Instalando dependencias y reiniciando..."
ssh $SERVER "cd /root/elys/backend && npm install --omit=dev --silent && pm2 restart elys-backend"

echo "→ Verificando..."
sleep 2
ssh $SERVER "pm2 show elys-backend | grep -E 'status|restarts'"

echo "✓ Deploy Elys completado"
