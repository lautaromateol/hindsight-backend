# Sprint 4: borradores desde PRs y superficie para agentes

Al cerrar este sprint, un PR mergeado con la etiqueta `decision` genera un borrador que el autor confirma desde GitHub, y un agente de IA puede consultar las decisiones que cubren una ruta por MCP o desde un `AGENTS.md` generado.

**Alcance.** Incluye los borradores desde PRs con alcance propuesto desde sus archivos, la bandeja, los comandos para confirmar y descartar, el servidor MCP de solo lectura, los tokens de agente, el archivo `AGENTS.md` generado y los enlaces entre decisiones con backlinks. No incluye el panel ni la auditoría exportable (sprint 5).

## Requisitos funcionales

| ID | El sistema deberá… | Prioridad |
| --- | --- | --- |
| RF-S4-01 | Crear un borrador cuando se mergea un PR con la etiqueta `decision` en un repositorio activo, con el título del PR como título, el cuerpo como contexto (aunque esté vacío) y el enlace al PR | Debe |
| RF-S4-02 | Proponer como alcance del borrador las carpetas comunes de los archivos modificados del PR (hasta 5 patrones), editables antes de confirmar | Debe |
| RF-S4-03 | Evitar duplicados: el mismo evento reenviado, o el mismo PR, no crea un segundo borrador | Debe |
| RF-S4-04 | Comentar una sola vez en el PR con el borrador listo y el enlace para editarlo | Debe |
| RF-S4-05 | Mostrar una bandeja con los borradores pendientes y las acciones Confirmar (pasa a aceptada; basta con título y contexto), Editar y Descartar | Debe |
| RF-S4-06 | Ofrecer un servidor MCP de solo lectura con las herramientas `decisions_for_path(ruta)`, `get_decision(número)`, `search_decisions(texto)` y `list_decisions(estado, etiqueta)` | Debe |
| RF-S4-07 | Permitir al owner crear, listar y revocar tokens de agente; mostrar el token una sola vez y guardar solo su hash | Debe |
| RF-S4-08 | Generar el contenido de una sección gestionada de `AGENTS.md` con las decisiones aceptadas y su alcance, descargable desde la app | Debe |
| RF-S4-09 | Aceptar los comandos `/escolio confirmar` y `/escolio descartar` de miembros del workspace sobre un borrador | Debería |
| RF-S4-10 | Prellenar contexto, decisión y alternativas si el cuerpo del PR tiene secciones con esos títulos, en español o inglés (Contexto o Context, Decisión o Decision, Alternativas o Alternatives) | Debería |
| RF-S4-11 | Reconocer enlaces `[[#N]]` y `[[Título]]` entre decisiones y mostrar los backlinks | Debería |
| RF-S4-12 | Registrar cada consulta de un agente (token, herramienta, ruta) para la auditoría | Debería |
| RF-S4-13 | Abrir un PR en el repositorio con la sección de `AGENTS.md` actualizada, lo que exige ampliar los permisos de la App a escritura de contenidos y PRs | Podría |

## Requisitos no funcionales

- RNF-S4-01 El servidor MCP responde en menos de 500 ms y solo expone decisiones aceptadas y propuestas, nunca borradores ni datos de otro workspace.
- RNF-S4-02 Los tokens de agente son de solo lectura, se guardan con hash, se pueden revocar y tienen límite de tasa.
- RNF-S4-03 El contenido que entrega el MCP se marca como datos de decisiones y no como instrucciones, porque el texto de una decisión lo escribe una persona y un agente podría obedecerlo sin querer.
- RNF-S4-04 La creación de borradores es idempotente por id de entrega y por PR.
- RNF-S4-05 Los enlaces entre decisiones se resuelven en el servidor, para que los backlinks siempre coincidan.
- RNF-S4-06 El bot es discreto: un solo comentario de cada tipo por PR, y solo cuando el PR lo pidió con la etiqueta o con un comando.

## Interfaces

- `POST /mcp` (servidor MCP por HTTP, autenticado con token de agente)
- `GET`, `POST` y `DELETE /api/workspaces/:id/agent-tokens`
- `GET /api/workspaces/:id/agents-file` (contenido de `AGENTS.md`)
- `GET /api/workspaces/:id/drafts` y `PATCH /api/workspaces/:id/decisions/:number` (confirmar un borrador)
- Eventos nuevos: `pull_request` (closed y merged, con etiqueta) e `issue_comment` con los comandos de confirmar y descartar
- Externa: API REST de GitHub (comentarios)

## Criterios de aceptación

1. Dado un PR mergeado sin la etiqueta `decision`, no se crea ningún borrador.
2. Dado un PR mergeado con la etiqueta, aparece un borrador con el título del PR, el enlace al PR y un alcance propuesto, y el bot comenta una vez en el PR.
3. Dado el mismo evento recibido dos veces, existe un solo borrador y un solo comentario.
4. Dado un PR cerrado sin merge, no se crea nada.
5. Dado un borrador, cuando un miembro comenta `/escolio confirmar`, pasa a aceptada y su autor es quien lo confirmó; si comenta alguien que no es miembro, no pasa nada.
6. Dado un agente con token válido, cuando consulta `decisions_for_path` con `src/db/users.ts`, recibe la decisión #12 en menos de 500 ms.
7. Dado un token revocado, la consulta recibe 401; dado un token de otro workspace, nunca devuelve estas decisiones.
8. Dado el `AGENTS.md` generado, lista solo decisiones aceptadas, cada una con su alcance.
9. Dada la decisión #4 con el texto `[[#2]]`, cuando se abre la #2, aparece la #4 entre sus backlinks.

## Definición de hecho

- [ ] El flujo etiqueta, merge, borrador y confirmación funciona con un repositorio de prueba propio
- [ ] Hay tests de borradores (duplicado, sin etiqueta, sin merge) y del MCP (permisos, revocación, aislamiento)
- [ ] Un agente real, por ejemplo Claude Code, consulta el MCP en una prueba
- [ ] El README explica cómo conectar un agente e incluye una plantilla de PR opcional
- [ ] Demo de tres minutos: un agente consulta la regla antes de escribir y un PR etiquetado produce un borrador

**Qué practicás.** Webhooks idempotentes, el protocolo MCP, tokens de acceso, generación de documentos y seguridad frente a la inyección de instrucciones.
