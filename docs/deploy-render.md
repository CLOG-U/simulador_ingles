# Despliegue en Render + Supabase

## Resumen

| Pieza | Servicio Render | Nombre sugerido |
|-------|-----------------|-----------------|
| Base de datos | Supabase (externo) | — |
| Backend API | Web Service (Docker) | `simulador-api` |
| Frontend | Static Site | `simulador` |

Son **servicios independientes**: la API solo expone `/api/v1/...` y el sitio web vive en el Static Site.

## 1. Supabase

1. Crea proyecto en [supabase.com](https://supabase.com)
2. **Settings → Database → Connection string**
3. Elige **Session pooler** (no "Direct connection")
4. Cambia el prefijo a `postgresql+asyncpg://`

> En Render la conexión directa `db.xxx.supabase.co` suele fallar por IPv6. Usa el pooler.

## 2. Backend (Web Service)

| Campo | Valor |
|-------|-------|
| Name | `simulador-api` |
| Root Directory | `backend` |
| Runtime | **Docker** |
| Plan | Free |
| Health check | `/api/v1/health/live` |

Variables:

```
ENVIRONMENT=production
DATABASE_URL=<supabase pooler>
SECRET_KEY=<string largo>
CORS_ORIGINS=https://TU-FRONTEND.onrender.com
LOG_LEVEL=INFO
```

`CORS_ORIGINS` = URL exacta del Static Site, **sin barra final**.

### Crear profesor (sin Shell)

Variables temporales + Manual Deploy:

```
ADMIN_USERNAME=profesor
ADMIN_FULL_NAME=Profesor Principal
ADMIN_PASSWORD=tu_clave_segura_min_8
```

Después de entrar, bórralas y vuelve a desplegar.

## 3. Frontend (Static Site)

| Campo | Valor |
|-------|-------|
| Name | `simulador` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

Variable de **build**:

```
VITE_API_BASE_URL=https://simulador-api-8jwy.onrender.com/api/v1
```

### Rewrite SPA (obligatorio)

En **Redirects/Rewrites**:

| Source | Destination | Action |
|--------|-------------|--------|
| `/*` | `/index.html` | Rewrite |

Sin esto, `/admin` o `/login` al recargar dan **Not Found**.

## 4. Cookies cross-site

Frontend y API están en hosts distintos (`*.onrender.com`). Con `ENVIRONMENT=production`
el backend setea cookies `Secure` + `SameSite=None` para que el login 200 no vaya
seguido de 401 en `/auth/me` o `/admin/dashboard`.

## 5. Verificación

1. API: `https://simulador-api-8jwy.onrender.com/api/v1/health/live` → `{"status":"ok"}`
2. Sitio: `https://TU-FRONTEND.onrender.com/login`
3. Login profesor → panel admin
4. En DevTools → Network: las peticiones a la API deben enviar cookie `access_token`

## Notas

- El plan free del backend se duerme; la primera carga puede tardar ~1 minuto
- Usa siempre la URL del **Static Site** para la app; la URL de la API es solo para `/api/v1`
