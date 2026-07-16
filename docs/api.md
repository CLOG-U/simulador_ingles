# API - Simulador de verbos

Prefijo base: `/api/v1`

## Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Inicio de sesión (cookies HttpOnly) |
| POST | `/auth/refresh` | Renovar tokens |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/me` | Usuario actual |
| POST | `/auth/change-password` | Cambiar contraseña |

## Estudiante

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/exam/config` | Reglas visibles |
| POST | `/attempts` | Iniciar o reanudar intento |
| GET | `/attempts/current` | Intento abierto |
| GET | `/attempts/{id}` | Detalle del intento |
| PATCH | `/attempts/{id}/questions/{qid}` | Guardar respuestas |
| POST | `/attempts/{id}/submit` | Entregar (idempotente) |
| GET | `/attempts/{id}/result` | Resultado y revisión |

## Administración

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/admin/users` | Listar / crear usuarios |
| POST | `/admin/users/import` | Importar CSV |
| POST | `/admin/users/{id}/reset-password` | Clave temporal |
| POST | `/admin/users/{id}/allow-new-attempt` | Habilitar nuevo intento |
| GET/PATCH | `/admin/verbs` | Banco de verbos |
| GET/PATCH | `/admin/exam-config` | Configuración |
| GET | `/admin/dashboard` | Resumen |
| GET | `/admin/attempts` | Resultados |
| GET | `/admin/attempts/export.csv` | Exportar CSV |
| GET | `/admin/audit-logs` | Auditoría |

## Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health/live` | Liveness |
| GET | `/health/ready` | Readiness (DB) |
