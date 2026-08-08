# API - Powerful English Academy

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

### Verb Exam

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/exam/config` | Reglas visibles |
| POST | `/attempts` | Iniciar o reanudar intento |
| GET | `/attempts/current` | Intento abierto |
| GET | `/attempts/{id}` | Detalle del intento |
| PATCH | `/attempts/{id}/questions/{qid}` | Guardar respuestas |
| POST | `/attempts/{id}/submit` | Entregar (idempotente) |
| GET | `/attempts/{id}/result` | Resultado y revisión |

### Past Simple Exam

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/past-simple/config` | Reglas visibles |
| GET | `/past-simple/attempts/status` | Disponibilidad e historial reciente |
| POST | `/past-simple/attempts` | Iniciar o reanudar intento |
| GET | `/past-simple/attempts/current` | Intento abierto |
| GET | `/past-simple/attempts/{id}` | Detalle del intento propio |
| PATCH | `/past-simple/attempts/{id}/questions/{qid}` | Guardar respuesta |
| POST | `/past-simple/attempts/{id}/submit` | Entregar (idempotente) |
| GET | `/past-simple/attempts/{id}/result` | Resultado y revisión |

### Past Simple Practice

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/past-simple/practice/status` | Disponibilidad de práctica |
| POST | `/past-simple/practice/sessions` | Iniciar o reanudar práctica |
| GET | `/past-simple/practice/sessions/{id}` | Detalle de la sesión |
| POST | `/past-simple/practice/sessions/{id}/questions/{qid}/check` | Revisar respuesta con feedback |
| POST | `/past-simple/practice/sessions/{id}/submit` | Finalizar práctica |
| GET | `/past-simple/practice/sessions/{id}/result` | Resultado completo |

La práctica usa el mismo banco (100 preguntas) y selecciona 24 balanceadas (2 por tema). No consume intentos del examen.

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
| GET/PATCH | `/admin/past-simple/config` | Configuración Past Simple |
| GET/PATCH | `/admin/past-simple/questions` | Banco Past Simple |
| GET | `/admin/past-simple/attempts` | Resultados Past Simple |
| GET | `/admin/past-simple/attempts/{id}` | Reporte detallado |
| POST | `/admin/users/{id}/exams/past_simple_exam/reset` | Resetear examen y práctica del estudiante |
| GET | `/admin/users/{id}/exam-access` | Accesos del estudiante |
| PATCH | `/admin/users/{id}/exam-access/{exam_type}` | Habilitar o bloquear examen |
| POST | `/admin/users/{id}/exams/{exam_type}/allow-new-attempt` | Autorizar reintento |

## Health

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health/live` | Liveness |
| GET | `/health/ready` | Readiness (DB) |
