# Sprint 3: GitHub App y check de decisiones en el PR

Al cerrar este sprint, cuando se abre un PR en un repositorio activo, Escolio crea en GitHub un check que lista las decisiones que el PR toca; si alguna exige respuesta, el check queda pendiente hasta que un miembro responda desde GitHub, y la respuesta queda registrada. Este es el diferencial del producto.

**Alcance.** Incluye el registro y la instalación de la GitHub App, el vínculo entre instalación y workspace, los repositorios activos, el webhook firmado, la cola en PostgreSQL, la evaluación de PRs, los check runs, las respuestas por botón y por comando y su registro. No incluye borradores ni acceso para agentes (sprint 4) ni el panel y la auditoría exportable (sprint 5). Escolio no bloquea merges por sí mismo: el bloqueo depende de que el repositorio exija el check en la protección de rama (RF-S3-16).

## Requisitos funcionales

| ID | El sistema deberá… | Prioridad |
| --- | --- | --- |
| RF-S3-01 | Permitir que un owner instale la GitHub App y vincule la instalación con su workspace mediante un flujo con parámetro `state` | Debe |
| RF-S3-02 | Listar los repositorios de la instalación y permitir al owner activar o desactivar cada uno | Debe |
| RF-S3-03 | Recibir los eventos de GitHub en un único webhook y verificar la firma `X-Hub-Signature-256`; si es inválida, responder 401 y no procesar nada | Debe |
| RF-S3-04 | Encolar el procesamiento de cada evento, responder 2xx de inmediato e ignorar los eventos no soportados y los repositorios no activos | Debe |
| RF-S3-05 | Cuando un PR se abre, recibe commits nuevos, se reabre o se marca listo para revisión, obtener sus archivos modificados (con paginación) y compararlos con los alcances de las decisiones aceptadas y propuestas | Debe |
| RF-S3-06 | Crear o actualizar en cada SHA un check run "Escolio · Decisiones": success si no hay coincidencias, neutral si solo coinciden decisiones informativas y action_required mientras falte la respuesta a una decisión que la exige | Debe |
| RF-S3-07 | Mostrar en el check, para cada decisión coincidente, su número, título, estado, enlace y hasta 10 archivos del PR que coinciden | Debe |
| RF-S3-08 | Ofrecer en el check el botón "Sigue vigente", que registra la respuesta de quien hace clic | Debe |
| RF-S3-09 | Aceptar el comando `/escolio excepcion <motivo>` en un comentario del PR, que registra la excepción con su motivo | Debe |
| RF-S3-10 | Aceptar respuestas solo de miembros del workspace, reconocidos por su usuario de GitHub; si responde otra persona, ignorar la respuesta y avisar una sola vez | Debe |
| RF-S3-11 | Pasar el check a success cuando todas las decisiones que exigen respuesta la tienen en ese PR; si un cambio posterior suma una decisión nueva, el check vuelve a action_required solo por esa | Debe |
| RF-S3-12 | Registrar cada respuesta con su tipo, motivo, autor (usuario de GitHub y de Escolio), PR, SHA y fecha | Debe |
| RF-S3-13 | Reintentar con espera creciente los errores de GitHub y, agotados los intentos, cerrar el check como neutral con una explicación | Debe |
| RF-S3-14 | Aceptar el comando `/escolio reemplazar #N`, que crea un borrador de decisión que reemplaza a la #N y lo enlaza al PR | Debería |
| RF-S3-15 | Mostrar en el detalle de una decisión los PRs que la tocaron y las respuestas recibidas | Debería |
| RF-S3-16 | Mostrar en ajustes una guía para exigir el check en la protección de rama del repositorio | Debería |
| RF-S3-17 | Publicar un único comentario en el PR con el resumen de las decisiones afectadas, para quien no mira los checks | Podría |

## Requisitos no funcionales

- RNF-S3-01 La firma se compara en tiempo constante y se calcula sobre el cuerpo crudo del pedido, no sobre el JSON ya interpretado.
- RNF-S3-02 El webhook responde en menos de 10 segundos, que es el límite de GitHub; el trabajo pesado corre en la cola.
- RNF-S3-03 El procesamiento es idempotente por id de entrega y por (repositorio, número de PR, SHA): reenviar un evento no crea un segundo check ni una segunda respuesta.
- RNF-S3-04 Los tokens de instalación se piden a GitHub bajo demanda, expiran en una hora y no se guardan; la clave privada de la App vive solo en variables de entorno.
- RNF-S3-05 Se soportan PRs de hasta 300 archivos, recorriendo las páginas de la API, y se respetan los límites de tasa que informa GitHub.
- RNF-S3-06 Un trabajo fallido se reintenta hasta 3 veces con espera creciente y queda registrado como fallido, con su causa.
- RNF-S3-07 El check explica siempre su resultado (qué decisión, qué archivos, qué falta) para que responder sea rápido.
- RNF-S3-08 Solo se piden a GitHub rutas y conteos de líneas; nunca se leen contenidos de archivos.

## Interfaces

- `POST /api/webhooks/github` (público, protegido por firma)
- `GET /api/github/install` y `GET /api/github/callback` (vínculo con el workspace)
- `GET` y `PATCH /api/workspaces/:id/repos`
- `GET /api/workspaces/:id/evaluations` (con filtros por PR y estado)
- Eventos que recibe: `pull_request` (opened, synchronize, reopened, ready_for_review), `check_run` (requested_action), `issue_comment` (created), `installation` e `installation_repositories`
- Externa: API REST de GitHub (checks, archivos de PRs, comentarios y tokens de instalación)

## Criterios de aceptación

1. Dado un webhook con firma inválida, la respuesta es 401 y no existe ninguna evaluación ni check nuevo.
2. Dada la decisión #12 con alcance `src/db/**` y modo "requiere respuesta", cuando se abre un PR que modifica `src/db/users.ts`, aparece en GitHub un check action_required con la #12 listada en menos de 15 segundos.
3. Dado un PR que no toca ningún alcance, el check queda en success con el texto "Sin decisiones afectadas".
4. Dada una decisión en modo informativo, el check queda en neutral y no bloquea.
5. Dado un miembro que hace clic en "Sigue vigente", el check pasa a success y la respuesta queda registrada con su nombre.
6. Dado el comentario `/escolio excepcion usamos Mongo solo en este script`, cuando lo escribe alguien que no es miembro, el estado no cambia; cuando lo escribe un miembro, pasa a success y el motivo queda registrado.
7. Dado el mismo evento recibido dos veces, existe un solo check y una sola respuesta.
8. Dado un commit nuevo que toca una decisión que exige respuesta y todavía no la tiene, el check vuelve a action_required solo por esa decisión.
9. Dada una falla de la API de GitHub que persiste tras los reintentos, el check queda neutral con una explicación y Escolio no deja el merge bloqueado.
10. Dada una decisión de otro workspace, nunca aparece en el check.

## Definición de hecho

- [ ] El flujo PR, check, respuesta y registro funciona con un repositorio de prueba propio
- [ ] Hay tests del webhook con firma válida, firma inválida, reenvío y repositorio inactivo
- [ ] Existen payloads de ejemplo guardados y un script que los envía firmados
- [ ] El README explica cómo crear e instalar la GitHub App y cómo exigir el check
- [ ] Demo de tres minutos: un PR toca una decisión, el check queda pendiente y se resuelve desde GitHub

**Qué practicás.** GitHub Apps (JWT y tokens de instalación), la API de Checks, HMAC, colas en PostgreSQL, idempotencia y tolerancia a fallos de servicios externos.
