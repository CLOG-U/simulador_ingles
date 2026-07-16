#!/bin/sh
# Compila el frontend y lo deja en backend/app/static (para Render con rootDir=backend).
set -e
cd "$(dirname "$0")/.."
cd frontend
npm install
VITE_API_BASE_URL=/api/v1 npm run build
cd ..
rm -rf backend/app/static
mkdir -p backend/app/static
cp -a frontend/dist/. backend/app/static/
echo "Frontend embebido en backend/app/static"
