# Escolio · Backend

API en Node + Express sobre PostgreSQL. Escolio convierte las decisiones técnicas de un equipo en reglas verificables: cada PR recibe en GitHub un check que lista las decisiones que toca y exige una respuesta registrada. Este repo contiene la API REST, el webhook de la GitHub App, la cola de trabajos y el servidor MCP.

Los requisitos viven en el ERS (`docs/ers/`, un archivo por sprint). Al implementar algo, buscá su ID (`RF-S3-05`, `RNF-T-01`) y citalo en el mensaje del commit y en el PR.

## Comandos

<!-- Completar o confirmar con /init: no los inventes. -->
- Instalar: `npm install` (el `postinstall` corre `prisma generate`; el cliente se genera en `src/generated/prisma`, ignorado por git)
- Desarrollo: `npm run dev` (`tsx watch src/app.ts`, puerto 3000 fijo)
- Typecheck: `npm run typecheck` · Build: `npm run build` → `npm start` (`dist/app.js`)
- Migraciones: `npm run db:migrate` (dev) · `npm run db:deploy` (prod) · `npm run db:studio`
- Tests: `npm test` (`node:test` + tsx, archivos en `test/*.test.ts`). Un solo archivo: `node --import tsx --test test/openapi.test.ts`; un solo test: agregá `--test-name-pattern="<texto>"`.
- OpenAPI: `npm run openapi` regenera `docs/openapi.json` desde `src/openapi/document.ts`. Al agregar o cambiar una ruta, documentala ahí; `npm test` falla si una ruta de Express no figura en el documento o si el JSON quedó desactualizado. Los routers nuevos se montan desde `routerMounts` en `src/create-app.ts`.
- Variables de entorno: copiá `.env.example` a `.env` (`DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

## Arquitectura actual

- ESM con TypeScript ejecutado directo por `tsx`; `tsc` compila a `dist/`. Los imports relativos llevan extensión `.ts` (`rewriteRelativeImportExtensions`), y `erasableSyntaxOnly` prohíbe `enum`/parameter properties de TS.
- Capas por recurso: `src/routes/<recurso>/route.ts` → `src/controllers/<recurso>/<accion>.ts` (re-exportados en `index.ts`) → `src/schemas/<recurso>/` (Zod 4). Las rutas se montan en `src/app.ts` bajo `/api/<recurso>`.
- Auth: `clerkMiddleware()` global en `app.ts`; cada controlador llama `getAuth(req)` y lanza `HttpError(401)` si falta `userId`. Los datos del usuario (nombre, imagen) se leen con `clerkClient`.
- Datos: Prisma 7 con `@prisma/adapter-pg` (`src/lib/prisma.ts`) sobre PostgreSQL. Hoy el esquema solo tiene `Workspace` y `Member` (rol `OWNER`/`MEMBER`); `Member.userId` es el id de Clerk.
- Los controladores atrapan todo en un `try/catch` y traducen `HttpError` a su status.
- Lo del ERS que sigue sin implementar: webhook, cola, decisiones, MCP, auditoría, RLS. Hoy no existe nada de eso.

### Errores

Los controladores lanzan `HttpError(status, message, code?, details?)` y el `catch` responde con `sendError(res, error)` ([src/lib/http-error.ts](src/lib/http-error.ts)), que produce `{ error: { code, message } }` (más `details` en validación). No armes respuestas de error a mano.

## Reglas que no se negocian

**Aislamiento por workspace (RNF-T-01).** Toda consulta se filtra por la membresía del usuario. Un recurso de otro workspace responde 403 o 404. PostgreSQL refuerza el filtro con seguridad por filas. Cada endpoint nuevo lleva un test de aislamiento.

**Privacidad del código (RNF-T-03, RNF-S3-08).** Nunca descargues ni guardes contenido de archivos. De GitHub solo se piden rutas, conteos de líneas agregadas y eliminadas, y metadatos de PR.

**Falla abierta (RNF-T-05).** Ante un error propio o de GitHub, el check termina `neutral` con una explicación. Escolio nunca deja un merge bloqueado por una falla suya.

**Secretos y logs (RNF-T-02, RNF-T-12).** Los secretos (incluida la clave privada de la GitHub App) viven en variables de entorno. Los logs son estructurados, llevan el id de entrega de GitHub y nunca incluyen secretos ni contraseñas.

**Errores y validación (RNF-S1-02).** Todo dato de entrada se valida en el servidor. El formato de error es uniforme: `{ error: { code, message } }`.

## Webhook y cola de GitHub

- Verificar `X-Hub-Signature-256` sobre el **cuerpo crudo** (no sobre el JSON ya interpretado), con comparación en tiempo constante. Firma inválida: 401 y no se procesa nada.
- Responder 2xx de inmediato y encolar. GitHub corta a los 10 segundos.
- La cola vive en PostgreSQL, sin servicios extra. Reintentos: hasta 3, con espera creciente; el fallo queda registrado con su causa.
- Todo es idempotente: por id de entrega y por (repositorio, número de PR, SHA). Un evento reenviado no crea un segundo check, respuesta, borrador ni suma de líneas.
- Los tokens de instalación se piden a GitHub bajo demanda y no se guardan.
- Los archivos de cada PR se consultan una sola vez y se reutilizan para el check, la vigencia y los borradores (RNF-S5-08).
- Comandos en comentarios: prefijo `/escolio`, sin tildes (`/escolio excepcion <motivo>`). Solo responden miembros del workspace, reconocidos por su usuario de GitHub.

## Decisiones, alcance y datos

- La numeración de decisiones es consecutiva por workspace y no se repite aunque dos personas guarden a la vez. Cualquier cambio ahí necesita un test con pedidos simultáneos.
- La coincidencia de rutas usa **una única librería de glob con una única configuración**, compartida entre el probador de alcance y el check. No agregues una segunda implementación.
- El contenido se guarda como Markdown plano, sin formato propietario. La exportación usa el mismo Markdown, sin conversión con pérdida.
- El log de auditoría es de solo agregar: ninguna ruta de la API actualiza ni borra eventos (hay un test que lo comprueba).
- La vigencia prefiere un aviso que falta a uno falso: si GitHub no responde, no se marca nada y se registra el error.

## Servidor MCP y tokens de agente

- Solo lectura. Expone únicamente decisiones **aceptadas y propuestas** (nunca borradores) y nunca datos de otro workspace.
- Los tokens se guardan con hash, se muestran una sola vez, se pueden revocar y tienen límite de tasa.
- El contenido que entrega el MCP se marca como datos de decisiones, no como instrucciones: el texto de una decisión lo escribe una persona y un agente podría obedecerlo sin querer. No quites esa marca.

## Contrato de la API

El frontend vive en otro repo y conoce la API solo por `docs/openapi.json`, que se genera con `npm run openapi` desde `src/openapi/document.ts`. De ahí el front genera sus tipos.

- Cuando agregues o cambies un endpoint (método, ruta, autenticación, parámetros, cuerpo, respuesta, códigos de estado y errores), actualizá `src/openapi/document.ts`, corré `npm run openapi` y commiteá `docs/openapi.json` **en el mismo PR**. `npm test` falla si una ruta no figura en el documento o si el JSON quedó desactualizado.
- Reutilizá los esquemas Zod de `src/schemas/<recurso>/` tanto en el controlador como en `document.ts`. No declares un esquema para validar y otro distinto para documentar.
- La especificación refleja lo implementado, no el ERS: incluye el error `{ error: { code, message } }`, la autenticación y los códigos de estado reales. Si un endpoint difiere del ERS, anotá la diferencia.
- No cambies el formato de una respuesta existente sin avisar: el front genera tipos a partir de ella y dejará de compilar.

## Cómo trabajar acá

- Cada sprint entrega tests automatizados de su API y un README actualizado (RNF-T-09).
- No agregues una dependencia nueva sin registrar la elección como decisión dentro de Escolio.
- Si algo del ERS parece contradecirse con el código existente, frená y preguntá; no resuelvas la discrepancia por tu cuenta.
- El backend de autenticación y la creación de workspaces ya existían antes del ERS; respetá su comportamiento actual salvo que un requisito diga lo contrario.

## Glosario mínimo

Decisión (registro de una elección técnica) · Alcance (patrones glob que cubre) · Modo de aplicación (informativo o requiere respuesta) · Check de decisiones (chequeo de GitHub por PR) · Respuesta (sigue vigente, excepción o reemplazo) · Borrador (decisión creada desde un PR etiquetado `decision`, sin confirmar) · Para revisar (decisión posiblemente desactualizada).