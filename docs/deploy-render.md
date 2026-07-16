# Despliegue en Render + Supabase

## Resumen

| Pieza | Servicio Render | Nombre sugerido |
|-------|-----------------|-----------------|
| Base de datos | Supabase (externo) | — |
| App (API + frontend) | Web Service (Docker) | `simulador-api` |

Un solo servicio sirve la API y el frontend. Así:

- `/admin`, `/student`, etc. **no** devuelven Not Found (fallback SPA en FastAPI)
- Las cookies de sesión son **mismo origen** (el login deja de fallar con 401 después del 200)

## 1. Supabase (cuando tengas la URL)

1. Crea proyecto en [supabase.com](https://supabase.com)
2. **Settings → Database → Connection string**
3. Elige **Session pooler** (no "Direct connection")
4. Copia la URI y cambia el prefijo a `postgresql+asyncpg://`

> **Render + Supabase:** la conexión directa `db.xxx.supabase.co` suele fallar con
> `OSError: [Errno 101] Network is unreachable` porque usa IPv6. El pooler sí funciona.

## 2. Web Service en Render

En **New → Web Service** (o actualiza el existente):

| Campo | Valor |
|-------|-------|
| Name | `simulador-api` |
| Root Directory | *(vacío / raíz del repo)* |
| Dockerfile Path | `./Dockerfile` |
| Runtime | **Docker** |
| Plan | Free |

> Si el servicio viejo tenía Root Directory = `backend`, cámbialo a vacío y usa el
> `Dockerfile` de la raíz. Ese build incluye el frontend.

**Variables de entorno:**

```
ENVIRONMENT=production
DATABASE_URL=<tu url de supabase>
SECRET_KEY=<string aleatorio largo>
CORS_ORIGINS=https://simulador-api.onrender.com
LOG_LEVEL=INFO
```

Usa la URL exacta que Render asigne al servicio (sin barra final).

**Health check path:** `/api/v1/health/live`

La app completa queda en:

```
https://simulador-api.onrender.com
```

(login en `/login`, API en `/api/v1/...`).

### Crear profesor (sin Shell)

Añade temporalmente en Environment:

```
ADMIN_USERNAME=profesor
ADMIN_FULL_NAME=Profesor Principal
ADMIN_PASSWORD=tu_clave_segura_min_8
```

Haz **Manual Deploy**. Tras confirmar el login, **borra** esas 3 variables y vuelve a desplegar.

## 3. Cookies de auth

En `ENVIRONMENT=production` el backend setea cookies con `Secure` y `SameSite=None`
(por si aún usas un frontend aparte). Con el frontend embebido, el navegador envía
las cookies en el mismo sitio sin problemas.

## 4. Static Site aparte (opcional, no recomendado)

Si mantienes un Static Site separado, necesitas rewrite `/* → /index.html` en
Redirects/Rewrites y `VITE_API_BASE_URL=https://<api>/api/v1`. Eso vuelve a ser
cross-site y es la causa habitual de login 200 + luego 401 / Not Found.

Preferible: usar solo la URL del Web Service.

## 5. Verificación

1. `https://simulador-api.onrender.com/api/v1/health/live` → `{"status":"ok"}`
2. `https://simulador-api.onrender.com/api/v1/health/ready` → `{"status":"ready"}`
3. Abrir `https://simulador-api.onrender.com/login` → entrar como profesor
4. Tras login, `/admin` debe cargar (no Not Found) y las peticiones llevan cookie `access_token`

## Notas

- El plan free **se duerme** tras inactividad; la primera carga puede tardar ~1 minuto
- Tras este cambio, haz **Manual Deploy** del Web Service si Render no redeploya solo
