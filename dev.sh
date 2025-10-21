#!/usr/bin/env bash
# dev.sh - inicia backend e frontend (dev) com checagem de versão do Node
# Uso: ./dev.sh

# Requisitos: Node.js >= 20.19.0
# Estrutura do projeto:
# downloader-full/
#├── node_modules
#   └── ... (módulos Node.js)
#├── assets
#   └── ... (imagens, estilos, etc.)
#├── backend
#   ├── server.js
#   ├── package.json
#   ├── package-lock.json
#   └── ... (outros arquivos do backend)
#├── frontend
#   ├── index.html
#   ├── src
#   │   └── ... (arquivos fonte do frontend)
#   ├── package.json
#   ├── package-lock.json
#   └── ... (outros arquivos do frontend)
#├── config
#   └── ... (arquivos de configuração)
#├── logs
#   └── ... (arquivos de log)
#├── dev.sh
#├── .gitignore
#├── package.json
#├── package-lock.json
#├── README.md

set -euo pipefail
cd "$(dirname "$0")"

REQUIRED_NODE_MAJOR=20
REQUIRED_NODE_MINOR=19

node_version_raw=$(node -v 2>/dev/null || echo "v0.0.0")
# remove 'v'
node_version=${node_version_raw#v}
IFS=. read -r MAJOR MINOR PATCH <<< "$node_version"
MAJOR=${MAJOR:-0}
MINOR=${MINOR:-0}

if [ "$MAJOR" -lt "$REQUIRED_NODE_MAJOR" ] || { [ "$MAJOR" -eq "$REQUIRED_NODE_MAJOR" ] && [ "$MINOR" -lt "$REQUIRED_NODE_MINOR" ]; }; then
  echo "Seu Node.js: $node_version_raw"
  echo "Vite requer Node.js >= ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}. Por favor, atualize (nvm use, n, apt, etc.)"
  # we'll still try to start backend; frontend provavelmente falhará
fi

BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend-react"

# start backend
pushd "$BACKEND_DIR" >/dev/null
  echo "Iniciando backend..."
  # kill existing if running on 4000
  existing_pid=$(ss -ltnp 2>/dev/null | grep ':4000' | sed -n 's/.*pid=\([0-9]*\).*/\1/p' || true)
  if [ -n "$existing_pid" ]; then
    echo "Matando processo existente em 4000 (pid=$existing_pid)"
    kill "$existing_pid" || true
    sleep 0.5
  fi
  node server.js &
  BACK_PID=$!
  echo "Backend PID: $BACK_PID"
popd >/dev/null

# wait for backend healthy
for i in {1..10}; do
  if curl -sS --fail http://localhost:4000/ >/dev/null 2>&1 || ss -ltnp 2>/dev/null | grep -q ':4000'; then
    echo "Backend parece rodando"
    break
  fi
  echo "Aguardando backend... ($i)"
  sleep 0.5
done

# start frontend
pushd "$FRONTEND_DIR" >/dev/null
  echo "Iniciando frontend (vite)..."
  npm run dev
popd >/dev/null

# on exit, kill backend
trap "echo 'Interrompido, matando backend $BACK_PID'; kill $BACK_PID || true" EXIT
