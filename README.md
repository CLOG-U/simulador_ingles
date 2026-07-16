# Simulador de verbos - Powerful English Academy

Aplicación web de evaluación de verbos en inglés para estudiantes de la academia.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Python + FastAPI + SQLAlchemy + Alembic
- **Base de datos:** PostgreSQL

## Requisitos

- Docker y Docker Compose
- Node.js 20+ (desarrollo local del frontend)
- Python 3.12+ (desarrollo local del backend)

## Inicio rápido

```bash
cp .env.example .env
docker compose up --build
```

Servicios:

| Servicio   | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173      |
| Backend    | http://localhost:8000      |
| API docs   | http://localhost:8000/docs   |
| PostgreSQL | localhost:5432             |

## Desarrollo local

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed_verbs
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Comandos útiles

```bash
# Migraciones
cd backend && alembic upgrade head

# Seed de verbos (idempotente)
cd backend && python -m scripts.seed_verbs

# Crear administrador inicial
cd backend && python -m scripts.create_admin

# Pruebas
cd backend && pytest
cd frontend && npm test
```

## Documentación

- [Plan maestro](plan.md) — especificación completa del MVP
- [API](docs/api.md) — endpoints (en construcción)
- [Decisiones](docs/decisions/) — decisiones técnicas y pedagógicas

## Fases de implementación

Ver `plan.md` sección 16. Estado actual: **Fase 1 — Base técnica**.
