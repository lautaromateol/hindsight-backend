# Escolio · Backend

API REST en Node + Express sobre PostgreSQL. Escolio convierte las decisiones técnicas de un equipo en reglas verificables. Este repo es el backend; el frontend vive en otro repo y conoce la API solo por [docs/openapi.json](docs/openapi.json).

Estado: sprint 1 (autenticación con Clerk, workspaces con invitación por código, perfil con usuario de GitHub, lista de miembros). Los requisitos están en [docs/ers/](docs/ers/).

## Instalar y correr

Necesitás Node 22 y una base PostgreSQL.

```bash
git clone <url-del-repo> && cd hindsight-backend
npm install
cp .env.example .env        # completá DATABASE_URL y las claves de Clerk
npm run db:deploy
npm run dev                 # http://localhost:3000
```

Variables de entorno (ver `.env.example`):

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Conexión de la API. Debe usar el rol `escolio_app` (ver [docs/rls.md](docs/rls.md)). |
| `MIGRATION_DATABASE_URL` | Opcional. Dueño de las tablas, para las migraciones; sin ella se usa `DATABASE_URL`. |
| `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Claves de Clerk (Dashboard > API keys). |
| `CORS_ORIGINS` | Orígenes del frontend, separados por coma. Por defecto `http://localhost:3001`. |

La seguridad por filas de PostgreSQL solo rige si la API se conecta con un rol sin `BYPASSRLS` que no sea dueño de las tablas. Creá ese rol **antes** de `db:deploy`; el SQL está en [docs/rls.md](docs/rls.md). Al arrancar, la API avisa en el log (`rls_bypassed`) si no se cumple.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor con recarga, puerto 3000 (fijo). |
| `npm run typecheck` | Comprueba tipos. |
| `npm run build` / `npm start` | Compila a `dist/` y lo ejecuta. |
| `npm test` | Tests (`node:test`). Falla si una ruta no figura en OpenAPI o si `docs/openapi.json` quedó desactualizado. |
| `npm run openapi` | Regenera `docs/openapi.json` desde `src/openapi/document.ts`. |
| `npm run db:migrate` / `db:deploy` / `db:studio` | Migraciones (desarrollo / producción) y Prisma Studio. |

## API del sprint 1

La autenticación la resuelve Clerk en el cliente; la API identifica al usuario por el token de sesión (`Authorization: Bearer <token>`). Todo error responde `{ error: { code, message } }`. El detalle está en [docs/openapi.json](docs/openapi.json).

| Ruta | Descripción |
| --- | --- |
| `GET`, `POST /api/workspace` | Listar mis workspaces; crear uno (quien lo crea es `OWNER`). |
| `POST /api/workspace/join` | Unirse con un código de invitación (queda como `MEMBER`). |
| `GET`, `PUT`, `DELETE /api/workspace/:id` | Ver, modificar y eliminar (los dos últimos, solo `OWNER`). |
| `GET /api/workspace/:workspaceId/member` | Miembros con rol y usuario de GitHub. |
| `GET`, `PATCH /api/auth/me` | Perfil y usuario de GitHub. |

Las rutas van en singular y difieren del ERS (`/api/workspaces`, `/members`); el ERS se mantiene como referencia de requisitos.

### Usuario de GitHub (RF-S1-07, RF-S1-10)

La verificación la hace Clerk, no la API: no hay `/api/auth/github`. Hay tres casos:

- **Entró con GitHub**: su usuario queda verificado (`githubVerified: true`, `githubSource: "clerk"`).
- **Entró con Google o correo y vinculó GitHub**: el cliente inicia la vinculación con Clerk (`user.createExternalAccount({ strategy: "oauth_github", redirectUrl })` o el componente `UserProfile`) y, al volver, llama a `GET /api/auth/me`, que lee la cuenta vinculada y lo deja verificado.
- **Todavía no vinculó nada**: `githubSource` es `null` y el cliente ofrece "Vincular GitHub". Como alternativa puede declarar su usuario a mano con `PATCH /api/auth/me` (`githubSource: "declared"`, sin verificar). Es único entre cuentas: si otra ya lo usa responde 409.

Requisito de configuración: habilitar la conexión social de GitHub en el Dashboard de Clerk (vale tanto para iniciar sesión como para vincular).

## Despliegue en Fly.io

Hay un [Dockerfile](Dockerfile) y un [fly.toml](fly.toml) (el release aplica las migraciones). Con la CLI `fly` instalada y una base PostgreSQL con el rol `escolio_app` creado:

```bash
fly launch --no-deploy --copy-config        # elegí un nombre de app único
fly secrets set DATABASE_URL=... MIGRATION_DATABASE_URL=... \
  CLERK_PUBLISHABLE_KEY=... CLERK_SECRET_KEY=... CORS_ORIGINS=https://tu-frontend
fly deploy
```

Después del deploy, `GET /` debe responder 200 y `GET /api/workspace` sin token, 401. Con un VPS propio sirve el mismo Dockerfile (`docker build` y `docker run -p 3000:3000` con las mismas variables, detrás de un proxy con TLS).

## Demo de tres minutos

1. Registro e inicio de sesión con Clerk en el cliente.
2. Crear un workspace y copiar su código de invitación.
3. Con una segunda cuenta, unirse con ese código.
4. Una de las cuentas vincula GitHub y la otra lo declara; ambas se ven en `GET /api/workspace/:workspaceId/member` con su usuario.

## Seguridad y datos

- Todo dato de entrada se valida en el servidor (Zod).
- Aislamiento por workspace: cada consulta filtra por la membresía y PostgreSQL lo refuerza con seguridad por filas ([docs/rls.md](docs/rls.md)).
- Las credenciales las custodia Clerk; los secretos viven en variables de entorno.
