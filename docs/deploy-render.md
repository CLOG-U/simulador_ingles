# Despliegue en Render + Supabase

## Resumen

| Pieza | Servicio Render | Nombre sugerido |
|-------|-----------------|-----------------|
| Base de datos | Supabase (externo) | — |
| Backend API | Web Service (Docker) | `simulador-api` |
| Frontend | Static Site | `simulador` |

## 1. Supabase (cuando tengas la URL)

1. Crea proyecto en [supabase.com](https://supabase.com)
2. **Settings → Database → Connection string**
3. Elige **Session pooler** (no "Direct connection")
4. Copia la URI y cambia el prefijo a `postgresql+asyncpg://`

> **Render + Supabase:** la conexión directa `db.xxx.supabase.co` suele fallar con
> `OSError: [Errno 101] Network is unreachable` porque usa IPv6. El pooler sí funciona.

## 2. Backend en Render

En **New → Web Service**:

| Campo | Valor |
|-------|-------|
| Name | `simulador-api` |
| Root Directory | `backend` |
| Runtime | **Docker** |
| Plan | Free |

**Variables de entorno** (pegar desde `.env.production`):

```
ENVIRONMENT=production
DATABASE_URL=<tu url de supabase>
SECRET_KEY=<string aleatorio largo>
CORS_ORIGINS=https://simulador.onrender.com
LOG_LEVEL=INFO
```

**Start Command:** déjalo vacío — el `Dockerfile` ya ejecuta `scripts/render_start.sh` (migraciones + seed + uvicorn).

**Health check path:** `/api/v1/health/live`

Tras el primer deploy exitoso, abre **Shell** en Render y crea el profesor:

```bash
python -m scripts.create_admin
```

> **Plan free sin Shell:** usa una de las opciones de la sección siguiente.

### Opción A — Variables de entorno en Render (recomendada sin Shell)

Añade temporalmente en Render → Environment:

```
ADMIN_USERNAME=profesor
ADMIN_FULL_NAME=Profesor Principal
ADMIN_PASSWORD=tu_clave_segura_min_8
```

Haz **Manual Deploy**. Al arrancar, el backend crea el admin automáticamente.

**Importante:** después de confirmar que funciona el login, **borra** esas 3 variables y vuelve a desplegar.

### Opción B — Desde tu PC (con Supabase accesible)

```powershell
cd backend
$env:DATABASE_URL="postgresql+asyncpg://postgres:...@db.xxx.supabase.co:5432/postgres"
$env:ENVIRONMENT="production"
$env:ADMIN_USERNAME="profesor"
$env:ADMIN_FULL_NAME="Profesor Principal"
$env:ADMIN_PASSWORD="tu_clave_segura"
python -m scripts.create_admin
```

## 3. Frontend en Render

En **New → Static Site**:

| Campo | Valor |
|-------|-------|
| Name | `simulador` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

**Variable de entorno (build):**

```
VITE_API_BASE_URL=https://simulador-api.onrender.com/api/v1
```

Reemplaza la URL por la que te asigne Render al backend.

## 4. Ajuste final de CORS

Cuando tengas la URL real del frontend, actualiza en el backend:

```
CORS_ORIGINS=https://simulador.onrender.com
```

Sin barra final. Si Render te da otro nombre (`simulador-xxxx.onrender.com`), usa esa URL exacta.

## 5. Verificación

1. `https://simulador-api.onrender.com/api/v1/health/live` → `{"status":"ok"}`
2. `https://simulador-api.onrender.com/api/v1/health/ready` → `{"status":"ready"}` (confirma Supabase)
3. Abrir frontend → login profesor → crear estudiante → examen

## Notas

- El plan free del backend **se duerme** tras inactividad; la primera carga puede tardar ~1 minuto
- El frontend estático **no se duerme**
- Puedes desplegar primero solo el backend y probar `/health/ready` antes del frontend
