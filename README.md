# Plataforma de exámenes - Powerful English Academy

Aplicación web de evaluaciones de inglés para estudiantes de la academia.

## Exámenes

- **Verb Exam:** evaluación existente de forma base, pasado y significado en español.
- **Past Simple Exam:** 24 preguntas mezcladas, dos por cada uno de 12 temas de
  interrogación, `did`, `was/were`, respuestas cortas y Question Words.

Cada examen mantiene configuración, acceso por estudiante, intentos, resultados e
historial independientes. El profesor habilita el acceso y autoriza nuevos intentos.

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
python -m scripts.seed_past_simple
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

# Seeds idempotentes
cd backend && python -m scripts.seed_verbs
cd backend && python -m scripts.seed_past_simple

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

Ver `plan.md` sección 16.

| Fase | Estado |
|------|--------|
| 0 — Aprobación pedagógica | Pendiente del propietario |
| 1 — Base técnica | Completada |
| 2 — Autenticación y usuarios | Completada |
| 3 — Motor de evaluación | Completada |
| 4 — Interfaces | Completada |
| 5 — Calidad y lanzamiento | En progreso |

## CI

GitHub Actions ejecuta lint, pruebas y build en cada push a `main`.
