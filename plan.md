# Plan maestro - Simulador de verbos de inglés

## 1. Identidad del proyecto

- **Repositorio:** `simulador_ingles`
- **Producto:** Simulador de verbos - Powerful English Academy
- **Tipo de repositorio:** privado
- **Frontend:** React + TypeScript + Vite
- **Backend:** Python + FastAPI
- **Base de datos:** PostgreSQL
- **Objetivo del documento:** dejar una especificación suficientemente precisa para que Cursor implemente el MVP sin tener que inventar reglas de negocio.

## 2. Objetivo del producto

Crear una aplicación web de evaluación para comprobar que cada estudiante domina tres datos de los verbos del PDF de la academia:

1. significado en español;
2. forma base en inglés;
3. pasado simple en inglés.

El banco inicial tendrá los **73 verbos del PDF**. Cada intento debe seleccionar **20 verbos distintos al azar**, sin repetir un verbo dentro del mismo intento. La columna `Past Participle` y la columna fonética `ED` del PDF quedan expresamente fuera del MVP.

El acceso será solo mediante cuentas creadas previamente por el profesor. No habrá registro público.

## 3. Decisiones funcionales cerradas

Estas decisiones deben tomarse como requisitos, no como sugerencias:

- Cada evaluación contiene exactamente 20 verbos distintos.
- La selección de verbos y el tipo de pregunta se hace en el backend, nunca en el navegador.
- Cada verbo se presenta mostrando uno de sus tres datos y solicitando los otros dos.
- En cada intento se preparan 7 preguntas desde español, 7 desde la forma base y 6 desde el pasado. Los tres grupos se mezclan para que el orden final sea impredecible.
- La combinación que recibe 6 preguntas rota o se elige al azar por intento, para evitar favorecer siempre el mismo tipo.
- No se muestran respuestas correctas antes de entregar la evaluación completa.
- Una pregunta puede recibir crédito parcial: cada campo correcto vale 1 punto. Hay 40 campos evaluables en total.
- El porcentaje se calcula como `campos_correctos / 40 * 100`.
- También se guarda el número de verbos completamente correctos para el reporte pedagógico.
- El porcentaje mínimo de aprobación será configurable; valor inicial: 70 %.
- El intento y sus respuestas esperadas se congelan al iniciarlo. Cambiar el banco después no altera un intento ya iniciado.
- Si se recarga la página, el estudiante continúa el intento abierto y recupera sus respuestas guardadas.
- La entrega final es idempotente: repetir la petición no duplica resultados ni cambia la nota.
- El MVP permite un intento por estudiante. El profesor puede habilitar un nuevo intento o reiniciar el anterior desde administración.
- El temporizador es configurable y estará desactivado por defecto.
- La aplicación debe funcionar correctamente en computadora y teléfono.

## 4. Mecánica exacta de las preguntas

### 4.1 Modos

| Modo | Dato mostrado | Campos que completa el estudiante | Ejemplo |
|---|---|---|---|
| `FROM_SPANISH` | Español | Forma base + pasado | `Ir` -> `go` + `went` |
| `FROM_BASE` | Forma base en inglés | Español + pasado | `go` -> `ir` + `went` |
| `FROM_PAST` | Pasado en inglés | Forma base + español | `went` -> `go` + `ir` |

La interfaz siempre debe mostrar una etiqueta como `Te damos: pasado en inglés`. Esto es indispensable para palabras como `read`, cuya forma base y pasado se escriben igual.

### 4.2 Algoritmo de creación del intento

1. Comprobar que el usuario está activo, tiene rol de estudiante y puede iniciar un intento.
2. Buscar todos los verbos activos. Si hay menos de 20, rechazar la operación y avisar al profesor.
3. Elegir 20 identificadores únicos usando `secrets.SystemRandom().sample(...)` o una solución de aleatoriedad equivalente del lado del servidor.
4. Crear una lista balanceada de tipos de pregunta: 7, 7 y 6; elegir al azar qué tipo recibe 6.
5. Mezclar tanto los verbos como los tipos y emparejarlos.
6. Guardar en una transacción el intento y 20 instantáneas de pregunta.
7. Devolver solo el dato mostrado, los campos solicitados, el orden y el progreso. No devolver respuestas esperadas, alias ni banderas de corrección.

### 4.3 Normalización y calificación

- Quitar espacios al inicio y al final.
- Convertir varias separaciones internas en un solo espacio.
- Comparar sin distinguir mayúsculas y minúsculas.
- Normalizar Unicode.
- En español, permitir respuesta con o sin tilde cuando la única diferencia sea el acento gráfico.
- En inglés, no corregir automáticamente errores ortográficos.
- Aceptar únicamente valores incluidos en la lista de respuestas válidas del verbo.
- No utilizar una API de traducción ni un modelo de IA para calificar.
- Para verbos compuestos, aceptar el texto completo normalizado: `wake up`, `pick up`.
- Guardar el texto original ingresado por el estudiante para que el profesor pueda revisarlo.

Cada campo se califica por separado. Una pregunta con una respuesta correcta y otra incorrecta obtiene 1 de 2 puntos. La pantalla final muestra:

- porcentaje total;
- campos correctos de 40;
- verbos completamente correctos de 20;
- estado aprobado/no aprobado;
- revisión por pregunta, si la política del profesor lo permite.

### 4.4 Ambigüedades que deben resolverse en el banco

El español no siempre identifica un único verbo inglés. El sistema debe almacenar un texto visible y una pista corta. No se debe ampliar indiscriminadamente la lista de respuestas, porque la forma base y el pasado deben corresponder al mismo verbo.

| Caso | Presentación recomendada cuando se pregunta desde español |
|---|---|
| `do / did` | `hacer (una actividad o tarea)` |
| `make / made` | `hacer (crear o fabricar)` |
| `drink / drank` | `tomar (beber)` |
| `take / took` | `tomar (coger/llevar)` |
| `say / said` | `decir (algo)` |
| `tell / told` | `decir o contar (a alguien)` |
| `look / looked` | `mirar` |
| `watch / watched` | `observar o mirar atentamente` |
| `see / saw` | `ver` |
| `listen / listened` | `escuchar (prestar atención)` |
| `hear / heard` | `oír` |
| `leave / left` | `salir o dejar` |
| `get / got` | `obtener, recibir o conseguir` |

La calificación de los dos campos debe hacerse contra el mismo registro de verbo. Por ejemplo, si la pregunta pertenece a `do`, el par esperado es `do/did`, no `make/made`, aunque ambos puedan traducirse como “hacer”.

## 5. Usuarios, acceso y permisos

### 5.1 Roles

**Profesor/administrador**

- crear cuentas individuales;
- importar estudiantes desde CSV;
- activar o desactivar cuentas;
- generar o restablecer una contraseña temporal;
- consultar el banco de verbos y activar/desactivar elementos;
- configurar nota mínima, duración, número de intentos y política de revisión;
- ver resultados individuales y generales;
- exportar resultados a CSV;
- habilitar un nuevo intento.

**Estudiante**

- iniciar sesión con las credenciales entregadas por el profesor;
- cambiar su contraseña temporal al primer ingreso;
- iniciar o reanudar su evaluación;
- responder y entregar;
- ver únicamente su propio resultado según la política definida.

### 5.2 Reglas de autenticación

- No existe pantalla ni endpoint de registro público.
- El primer administrador se crea mediante un comando seguro de inicialización, nunca con una contraseña escrita en el repositorio.
- Nombre de usuario único y no sensible a mayúsculas.
- Contraseñas almacenadas con hash Argon2id; nunca cifradas de forma reversible ni guardadas en texto plano.
- Contraseña temporal con cambio obligatorio en el primer acceso.
- Tokens de acceso y renovación en cookies `HttpOnly`, `Secure` y `SameSite=Lax`; no usar `localStorage` para credenciales.
- Rotación y revocación de tokens de renovación.
- Cierre de sesión que invalida la sesión activa.
- Límite de intentos de acceso y retraso progresivo ante credenciales incorrectas.
- Todas las operaciones administrativas generan un registro de auditoría.
- CORS limitado al dominio real del frontend.

## 6. Alcance del MVP

### Incluido

- inicio y cierre de sesión;
- cambio obligatorio de contraseña temporal;
- panel del estudiante;
- prueba aleatoria de 20 verbos;
- guardado automático y reanudación;
- calificación y revisión final;
- panel del profesor;
- gestión de usuarios;
- banco inicial de 73 verbos;
- activación/desactivación de verbos;
- configuración básica de evaluación;
- listado, filtros y detalle de resultados;
- exportación CSV;
- diseño adaptable y accesible;
- pruebas automatizadas y contenedores de desarrollo.

### Fuera del MVP

- audio o evaluación de pronunciación;
- participio pasado;
- terminaciones fonéticas `ED`;
- registro público;
- recuperación de contraseña por correo;
- inicio de sesión con Google u otras redes;
- aplicación móvil nativa;
- IA para calificación;
- clasificación pública de estudiantes;
- múltiples academias dentro de una misma instalación.

## 7. Experiencia de usuario

### 7.1 Pantallas del estudiante

1. **Inicio de sesión:** logo, usuario, contraseña, mostrar/ocultar contraseña y mensajes claros sin revelar si una cuenta existe.
2. **Cambio de contraseña:** aparece obligatoriamente cuando la cuenta usa clave temporal.
3. **Panel:** nombre del estudiante, estado del intento, reglas, botón iniciar/reanudar y resultado previo si corresponde.
4. **Instrucciones:** explicación de los tres modos, dos ejemplos y confirmación para comenzar.
5. **Evaluación:** una pregunta por pantalla, indicador `Pregunta 8 de 20`, dos campos, botones anterior/siguiente, guardado automático y navegador de preguntas.
6. **Confirmación de entrega:** avisa cuántas preguntas o campos están vacíos y exige confirmación.
7. **Resultado:** nota, estado, resumen y revisión permitida.

### 7.2 Pantallas del profesor

1. Resumen con estudiantes activos, intentos terminados, promedio y aprobados.
2. Usuarios: buscar, crear, importar CSV, activar/desactivar y restablecer clave.
3. Banco de verbos: consultar 73 registros, buscar y activar/desactivar.
4. Configuración: cantidad fijada en 20 para este MVP, nota mínima, temporizador, intentos y revisión.
5. Resultados: filtros por estudiante, estado y fecha; detalle de respuestas y exportación.
6. Auditoría: acciones sensibles y fecha/usuario responsable.

### 7.3 Comportamiento durante la prueba

- Guardar una respuesta al salir del campo y también con un pequeño `debounce`.
- Mostrar `Guardando...`, `Guardado` o `Sin conexión`.
- No perder texto si una petición falla; reintentar al recuperar conexión.
- Permitir moverse entre preguntas sin obligar a responder.
- Advertir antes de cerrar o recargar cuando haya cambios todavía no sincronizados.
- Nunca revelar si un campo es correcto mientras el intento esté abierto.
- La hora oficial y el vencimiento los determina el servidor.

## 8. Identidad visual

La paleta se deriva del logo proporcionado. El azul es el color dominante; amarillo, morado, rosa y celeste funcionan como acentos.

| Token | Color | Uso |
|---|---|---|
| `brand-primary` | `#002AEB` | encabezados, botón principal, progreso |
| `brand-primary-dark` | `#081B8F` | estados presionados, navegación y contraste |
| `brand-sky` | `#4CA5E0` | tarjetas informativas y foco suave |
| `brand-yellow` | `#FFE600` | acento y avisos; no usar como texto sobre blanco |
| `brand-purple` | `#70419B` | acento secundario |
| `brand-pink` | `#F20F68` | acento puntual, no como único indicador de error |
| `brand-white` | `#FCFEF9` | texto sobre azul y superficies claras |
| `surface` | `#F5F7FB` | fondo general |
| `text` | `#111827` | texto principal |
| `success` | `#15803D` | aprobado/correcto |
| `danger` | `#B42318` | error/no aprobado |

Lineamientos:

- Estética académica, limpia, optimista y sin exceso de elementos decorativos.
- Fondo claro con una franja o encabezado azul; tarjetas blancas con bordes suaves.
- Tipografía sugerida: Poppins para títulos e Inter para contenido, servidas desde el proyecto.
- Bordes redondeados de 12 a 16 px y sombras discretas.
- Los cuatro colores circulares del logo pueden aparecer como indicador de pasos o progreso.
- El foco del teclado debe ser claramente visible.
- Cumplir WCAG AA en contraste; no comunicar estados únicamente mediante color.
- Área táctil mínima de 44 x 44 px.
- Respetar `prefers-reduced-motion`.
- Solicitar al cliente el logo original en PNG transparente o SVG antes de producción; la captura recibida se utiliza solo como referencia de paleta, no como activo final.

## 9. Arquitectura técnica

### 9.1 Estructura del repositorio

```text
simulador_ingles/
├── plan.md
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/auth/
│   │   ├── features/exam/
│   │   ├── features/admin/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── styles/
│   └── tests/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── main.py
│   ├── migrations/
│   ├── scripts/
│   ├── seed/
│   └── tests/
└── docs/
    ├── api.md
    └── decisions/
```

### 9.2 Frontend

- React con TypeScript y Vite.
- React Router para rutas.
- TanStack Query para estado remoto, caché y reintentos.
- React Hook Form + Zod para formularios.
- CSS mediante Tailwind CSS o módulos CSS; elegir una sola opción al comenzar y documentarla.
- Cliente API centralizado que envíe cookies y traduzca errores a mensajes de interfaz.
- Rutas protegidas por sesión y rol, sin confiar en el frontend como control de seguridad.
- Pruebas con Vitest, Testing Library y Playwright para recorridos críticos.

### 9.3 Backend

- FastAPI con Pydantic.
- SQLAlchemy y Alembic.
- PostgreSQL en desarrollo y producción para evitar diferencias de comportamiento.
- Capa de servicios para autenticación, creación de intentos y calificación.
- Validación de permisos en cada endpoint.
- OpenAPI disponible solo de forma controlada en producción.
- Logs estructurados con identificador de petición, sin contraseñas, tokens ni respuestas completas del estudiante.
- Pruebas con Pytest.

### 9.4 Desarrollo local

- `docker compose up` inicia PostgreSQL, backend y frontend.
- `.env.example` documenta todas las variables sin secretos reales.
- Migraciones ejecutables de forma explícita y repetible.
- Un comando crea el administrador inicial solicitando la contraseña de forma interactiva o por secreto de entorno temporal.
- Un comando carga de manera idempotente los 73 verbos.

## 10. Modelo de datos

Usar UUID como identificadores públicos y fechas en UTC.

### `users`

- `id`
- `username` y `username_normalized` únicos
- `full_name`
- `password_hash`
- `role`: `ADMIN` o `STUDENT`
- `is_active`
- `must_change_password`
- `failed_login_count`
- `locked_until`
- `created_at`, `updated_at`, `last_login_at`

### `refresh_sessions`

- `id`, `user_id`
- hash del token, nunca el token en claro
- `expires_at`, `revoked_at`, `created_at`
- datos mínimos de dispositivo/IP, con política de retención

### `verbs`

- `id`
- `source_order` de 1 a 73, único
- `base_display`
- `past_display`
- `spanish_display`
- `spanish_prompt` con desambiguación
- `hint` opcional
- `is_active`
- `created_at`, `updated_at`

### `verb_answers`

- `id`, `verb_id`
- `field`: `BASE`, `PAST` o `SPANISH`
- `display_value`
- `normalized_value`
- restricción única por verbo, campo y valor normalizado

### `exam_config`

- `id`
- `question_count` con valor 20
- `passing_percentage` con valor inicial 70
- `duration_minutes` nullable
- `max_attempts` con valor inicial 1
- `review_policy`: `FULL`, `SCORE_ONLY` o `AFTER_CLOSE`
- `updated_by`, `updated_at`

### `attempts`

- `id`, `user_id`, `config_snapshot`
- `status`: `IN_PROGRESS`, `SUBMITTED`, `EXPIRED` o `CANCELLED`
- `started_at`, `expires_at`, `submitted_at`
- `correct_fields`, `total_fields` (= 40)
- `fully_correct_questions`, `percentage`, `passed`
- restricción para impedir más de un intento abierto por estudiante

### `attempt_questions`

- `id`, `attempt_id`, `position`
- `verb_id` solo como referencia
- instantánea de base, pasado, español, prompt y respuestas válidas
- `prompt_type`
- respuestas originales del estudiante
- resultado por campo
- `answered_at`, `graded_at`
- unicidad de `attempt_id + position` y `attempt_id + verb_id`

### `audit_logs`

- `id`, `actor_user_id`
- `action`, `target_type`, `target_id`
- metadatos mínimos sin secretos
- `created_at`

## 11. API propuesta

Prefijo: `/api/v1`.

### Autenticación

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

### Estudiante

- `GET /exam/config` - reglas visibles de la prueba
- `POST /attempts` - iniciar o devolver el intento abierto
- `GET /attempts/current`
- `GET /attempts/{id}` - preguntas sin soluciones mientras esté abierto
- `PATCH /attempts/{id}/questions/{question_id}` - guardar respuestas
- `POST /attempts/{id}/submit`
- `GET /attempts/{id}/result`

### Administración

- `GET/POST /admin/users`
- `GET/PATCH /admin/users/{id}`
- `POST /admin/users/import`
- `POST /admin/users/{id}/reset-password`
- `POST /admin/users/{id}/allow-new-attempt`
- `GET /admin/verbs`
- `PATCH /admin/verbs/{id}`
- `GET/PATCH /admin/exam-config`
- `GET /admin/attempts`
- `GET /admin/attempts/{id}`
- `GET /admin/attempts/export.csv`
- `GET /admin/dashboard`
- `GET /admin/audit-logs`

### Operación

- `GET /health/live`
- `GET /health/ready`

Todos los listados administrativos deben usar paginación, búsqueda y límites máximos. Los errores siguen un formato único con `code`, `message`, `field_errors` y `request_id`.

## 12. Requisitos funcionales y criterios de aceptación

| ID | Requisito | Criterio verificable |
|---|---|---|
| RF-01 | Acceso cerrado | No existe registro público y una cuenta inexistente no puede iniciar sesión. |
| RF-02 | Usuarios precreados | El profesor crea una cuenta y entrega una contraseña temporal. |
| RF-03 | Cambio de clave | La cuenta temporal no puede iniciar examen antes de cambiar la clave. |
| RF-04 | Sorteo | Cada intento contiene 20 verbos únicos tomados de los 73 activos. |
| RF-05 | Balance | Cada intento contiene distribución 7/7/6 entre los tres modos. |
| RF-06 | Dos respuestas | Toda pregunta solicita exactamente los dos datos que no se muestran. |
| RF-07 | Privacidad del examen | La API no expone soluciones antes de entregar. |
| RF-08 | Persistencia | Recargar o cambiar de dispositivo permite reanudar el intento abierto. |
| RF-09 | Parcial | Un campo correcto y otro incorrecto suma 1 de 2. |
| RF-10 | Entrega única | Enviar dos veces produce el mismo resultado, no dos calificaciones. |
| RF-11 | Reportes | El profesor puede ver y exportar notas y respuestas. |
| RF-12 | Seguridad | Las contraseñas nunca aparecen en base de datos, logs o respuestas. |
| RF-13 | Accesibilidad | La prueba completa se puede resolver solo con teclado. |
| RF-14 | Móvil | No hay desplazamiento horizontal a 360 px de ancho. |

## 13. Banco inicial extraído del PDF

Se conserva aquí la fuente pedagógica inicial. El seed debe transformar estos valores en minúsculas normalizadas para comparación, manteniendo estas formas para presentación. El participio pasado no se carga en el MVP.

| # | Base | Pasado | Español del PDF |
|---:|---|---|---|
| 1 | Go | Went | Ir |
| 2 | Work | Worked | Trabajar |
| 3 | Play | Played | Jugar |
| 4 | Cook | Cooked | Cocinar |
| 5 | Eat | Ate | Comer |
| 6 | Drink | Drank | Tomar |
| 7 | Drive | Drove | Manejar |
| 8 | Do | Did | Hacer |
| 9 | Get | Got | Obtener |
| 10 | Give | Gave | Dar |
| 11 | Read | Read | Leer |
| 12 | See | Saw | Ver, observar |
| 13 | Look | Looked | Mirar |
| 14 | Take | Took | Tomar |
| 15 | Study | Studied | Estudiar |
| 16 | Think | Thought | Pensar |
| 17 | Wash | Washed | Lavar |
| 18 | Watch | Watched | Observar, mirar |
| 19 | Have | Had | Tener |
| 20 | Find | Found | Encontrar |
| 21 | Wake up | Woke up | Despertar |
| 22 | Learn | Learned | Aprender |
| 23 | Write | Wrote | Escribir |
| 24 | Walk | Walked | Caminar |
| 25 | Make | Made | Hacer |
| 26 | Listen | Listened | Escuchar |
| 27 | Sleep | Slept | Dormir |
| 28 | Live | Lived | Vivir |
| 29 | Brush | Brushed | Cepillar |
| 30 | Can | Could | Poder |
| 31 | Want | Wanted | Querer |
| 32 | Need | Needed | Necesitar |
| 33 | Like | Liked | Gustar |
| 34 | Talk | Talked | Conversar |
| 35 | Speak | Spoke | Hablar |
| 36 | Remember | Remembered | Recordar |
| 37 | Understand | Understood | Entender |
| 38 | Spend | Spent | Gastar |
| 39 | Try | Tried | Intentar, tratar |
| 40 | Swim | Swam | Nadar |
| 41 | Come | Came | Venir |
| 42 | Start | Started | Empezar |
| 43 | Say | Said | Decir |
| 44 | Tell | Told | Decir, contar, narrar |
| 45 | Buy | Bought | Comprar |
| 46 | Bring | Brought | Traer |
| 47 | Change | Changed | Cambiar |
| 48 | Cut | Cut | Cortar |
| 49 | Fall | Fell | Caer |
| 50 | Fix | Fixed | Arreglar, reparar |
| 51 | Forget | Forgot | Olvidar |
| 52 | Lose | Lost | Perder |
| 53 | Open | Opened | Abrir |
| 54 | Close | Closed | Cerrar |
| 55 | Pay | Paid | Pagar |
| 56 | Put | Put | Poner |
| 57 | Run | Ran | Correr |
| 58 | Send | Sent | Enviar |
| 59 | Feel | Felt | Sentir |
| 60 | Teach | Taught | Enseñar |
| 61 | Wait | Waited | Esperar |
| 62 | Fly | Flew | Volar |
| 63 | Leave | Left | Dejar, salir |
| 64 | Know | Knew | Saber, conocer |
| 65 | Believe | Believed | Creer |
| 66 | Become | Became | Llegar a ser |
| 67 | Ask | Asked | Preguntar, pedir |
| 68 | Hear | Heard | Escuchar |
| 69 | Use | Used | Usar |
| 70 | Sing | Sang | Cantar |
| 71 | Text | Texted | Mensajear |
| 72 | Call | Called | Llamar |
| 73 | Pick up | Picked up | Recoger |

Antes de cerrar el seed, el profesor debe aprobar las desambiguaciones de la sección 4.4. Como mejora opcional pueden aceptarse variantes británicas explícitas, por ejemplo `learnt`, pero no deben agregarse sin aprobación porque el PDF enseña `learned`.

## 14. Seguridad, privacidad e integridad de la evaluación

- HTTPS obligatorio en producción.
- Secretos únicamente en variables del entorno o gestor de secretos.
- Dependencias revisadas y bloqueadas mediante archivos de lock.
- Cabeceras de seguridad: CSP, HSTS, `X-Content-Type-Options` y política de `frame-ancestors`.
- Protección CSRF si la autenticación usa cookies.
- Validación de tamaño y formato en importaciones CSV.
- Consultas parametrizadas mediante ORM.
- Autorización del backend en cada recurso: un estudiante nunca puede consultar el intento de otro.
- El frontend no recibe la lista completa de respuestas durante un intento.
- La nota se calcula nuevamente en el servidor al entregar.
- No registrar contraseñas, tokens, cookies ni cuerpos completos de autenticación.
- Copias de seguridad de PostgreSQL y procedimiento documentado de restauración.
- Política de retención de resultados y datos personales definida antes de producción.

No se pretende impedir que un estudiante consulte otra fuente fuera del sistema. El MVP protege la integridad técnica del intento, pero no implementa vigilancia, bloqueo del navegador ni reconocimiento facial.

## 15. Pruebas obligatorias

### Backend

- el sorteo nunca repite verbos;
- 1.000 intentos simulados mantienen siempre 20 verbos y distribución 7/7/6;
- el banco con menos de 20 activos produce error controlado;
- la normalización maneja mayúsculas, espacios y tildes según la regla;
- `do/did` no se mezcla con `make/made`;
- el puntaje parcial y el porcentaje son correctos;
- dos entregas idénticas devuelven el mismo resultado;
- un estudiante no puede leer o modificar intentos ajenos;
- el administrador sí puede consultar resultados;
- cuentas inactivas o bloqueadas no pueden acceder;
- migraciones y seed son idempotentes.

### Frontend

- validación y mensajes del inicio de sesión;
- cambio de contraseña temporal;
- representación de los tres tipos de pregunta;
- guardado y recuperación después de recargar;
- navegación con campos vacíos;
- confirmación de entrega;
- resultado con crédito parcial;
- rutas por rol;
- estados de carga, error y sin conexión;
- accesibilidad con teclado y lector de pantalla.

### Flujo completo

1. El profesor crea un estudiante.
2. El estudiante entra y cambia su clave.
3. Inicia una prueba con 20 verbos únicos.
4. Responde, recarga la página y conserva el progreso.
5. Entrega y recibe una sola nota.
6. El profesor ve el mismo resultado y lo exporta.

## 16. Plan de implementación por fases

### Fase 0 - Aprobación pedagógica

- validar las desambiguaciones;
- decidir si se aceptan variantes británicas;
- obtener el logo original;
- confirmar nota mínima, política de revisión y duración.

**Salida:** banco aprobado y decisiones documentadas.

### Fase 1 - Base técnica

- crear monorepo, Docker Compose y variables de ejemplo;
- configurar React/TypeScript y FastAPI/PostgreSQL;
- agregar calidad: formato, lint, tipos, pruebas y CI;
- crear modelos, migraciones y seed.

**Salida:** servicios levantan localmente y health checks responden.

### Fase 2 - Autenticación y usuarios

- sesiones seguras y permisos;
- comando de administrador inicial;
- gestión de usuarios y clave temporal;
- cambio de contraseña y auditoría.

**Salida:** profesor y estudiante acceden únicamente a sus áreas.

### Fase 3 - Motor de evaluación

- creación transaccional del intento;
- sorteo balanceado;
- instantáneas de preguntas;
- guardado automático;
- entrega idempotente y calificación.

**Salida:** API completamente probada para el recorrido del estudiante.

### Fase 4 - Interfaces

- aplicar sistema visual;
- construir flujo del estudiante;
- construir usuarios, verbos, configuración y resultados de administración;
- optimizar móvil y accesibilidad.

**Salida:** MVP funcional de extremo a extremo.

### Fase 5 - Calidad y lanzamiento

- pruebas de seguridad y autorización;
- pruebas de carga moderada;
- pruebas E2E y revisión visual;
- copias de seguridad, monitoreo y despliegue;
- crear administrador de producción y validar restauración.

**Salida:** versión lista para un grupo piloto.

## 17. Definición de terminado

El MVP se considera terminado solo cuando:

- los 73 verbos aprobados están cargados;
- cada intento produce 20 verbos únicos y distribución 7/7/6;
- no se exponen soluciones antes de entregar;
- guardado, reanudación, calificación parcial y entrega idempotente funcionan;
- el profesor puede administrar cuentas y consultar/exportar resultados;
- las pruebas críticas están automatizadas y pasan;
- no hay secretos en el repositorio;
- el flujo funciona a 360 px y con teclado;
- migraciones, seed, despliegue y restauración están documentados;
- se ejecutó un piloto con al menos una cuenta de profesor y dos cuentas de estudiante.

## 18. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Traducciones ambiguas | Pistas semánticas y respuestas ligadas a un registro de verbo. |
| Azar desequilibrado | Cuotas 7/7/6 con orden aleatorio. |
| Pérdida de progreso | Guardado automático, reintentos y reanudación del intento abierto. |
| Exposición de respuestas | Selección, instantáneas y calificación solo en backend. |
| Contraseñas compartidas | Cambio inicial, revocación de sesiones y auditoría. |
| Cambios al banco durante un examen | Instantánea inmutable por pregunta. |
| Doble entrega | Endpoint idempotente y transacción con bloqueo. |
| Logo de baja calidad | Solicitar PNG transparente o SVG antes del lanzamiento. |

## 19. Instrucción inicial para Cursor

Usar este texto al iniciar la implementación:

> Lee `plan.md` completo antes de escribir código. Implementa el proyecto por fases y comienza por la Fase 1. No cambies las reglas funcionales de las secciones 3 y 4. Mantén la selección y calificación exclusivamente en el backend. Antes de cada fase, presenta los archivos que crearás y las decisiones menores pendientes; después ejecuta pruebas y actualiza el README. No uses credenciales reales ni agregues secretos al repositorio.

## 20. Decisiones pendientes del propietario

Estas decisiones no bloquean la estructura inicial, pero deben confirmarse antes del piloto:

- aprobar las traducciones desambiguadas;
- decidir si el estudiante ve las respuestas correctas inmediatamente o solo la nota;
- confirmar si habrá temporizador y su duración;
- confirmar si 70 % es la nota mínima definitiva;
- definir cuánto tiempo se conservarán cuentas y resultados;
- entregar el logo original en buena calidad;
- definir dominio y plataforma de despliegue.

