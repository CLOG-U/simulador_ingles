# Build del frontend + API en un solo servicio (mismo origen en Render).
FROM node:20-alpine AS frontend

WORKDIR /frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
# Mismo origen: el navegador llama /api/v1 sin host cruzado.
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend /frontend/dist ./app/static

RUN chmod +x scripts/render_start.sh

EXPOSE 8000

CMD ["scripts/render_start.sh"]
