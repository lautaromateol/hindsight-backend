# Sprint 5: gobernanza, auditoría y vigencia

Al cerrar este sprint, el owner ve qué pasó en los PRs (cuántos tocaron decisiones, cuántos se respondieron, cuántas excepciones), exporta la auditoría y el sistema avisa cuándo una decisión puede haber quedado desactualizada.

**Alcance.** Incluye el panel de métricas, el registro de auditoría con exportación, la vigencia (líneas acumuladas, excepciones repetidas y fecha de revisión), la acción "Sigue vigente", la configuración del workspace, el resumen semanal por email, el panel de cobertura y la exportación completa a Markdown. No incluye análisis del contenido del código ni resúmenes con IA.

## Requisitos funcionales

| ID | El sistema deberá… | Prioridad |
| --- | --- | --- |
| RF-S5-01 | Mostrar al owner un panel con, para los últimos 7 y 30 días, los PRs evaluados, los que tocaron decisiones, las respuestas por tipo, el tiempo mediano de respuesta y las excepciones | Debe |
| RF-S5-02 | Registrar en un log inmutable las evaluaciones, las respuestas, los cambios de estado de decisiones, las altas y bajas de tokens y las consultas de agentes, con filtros por tipo, actor y fecha | Debe |
| RF-S5-03 | Exportar el log de auditoría en CSV y JSON | Debe |
| RF-S5-04 | Acumular por decisión las líneas cambiadas dentro de su alcance desde su última revisión (contando solo PRs mergeados) y marcarla "Para revisar" al llegar a N líneas (30 por defecto) o cuando un archivo de su alcance se elimina o se renombra | Debe |
| RF-S5-05 | Marcar una decisión "Para revisar" cuando acumula 2 excepciones o más en 30 días | Debe |
| RF-S5-06 | Ofrecer la acción "Sigue vigente" en la decisión, que limpia el aviso y reinicia los contadores; editar el contenido de la decisión también cuenta como revisión | Debe |
| RF-S5-07 | Mostrar el aviso con su motivo (PR, archivo, líneas o excepciones) en el detalle de la decisión, un indicador en la lista y un filtro "Para revisar" | Debe |
| RF-S5-08 | Evaluar la vigencia solo de decisiones aceptadas o propuestas, no de borradores, reemplazadas ni obsoletas | Debería |
| RF-S5-09 | Permitir una fecha de revisión opcional en la decisión y marcarla "Para revisar" con el motivo "revisión vencida" cuando pasa | Debería |
| RF-S5-10 | Permitir al owner configurar el umbral N, el modo de aplicación predeterminado de las decisiones nuevas y si responden los miembros o solo los owners | Debería |
| RF-S5-11 | Enviar cada semana por email a los miembros un resumen de decisiones para revisar, borradores pendientes y PRs con respuesta pendiente; no enviar nada si no hay pendientes | Debería |
| RF-S5-12 | Exportar el workspace completo como archivos Markdown en un .zip, con número, estado, etiquetas y alcance al inicio de cada archivo | Debería |
| RF-S5-13 | Mostrar un panel de cobertura con las carpetas de primer nivel de cada repositorio activo que no tienen ninguna decisión que las cubra | Debería |
| RF-S5-14 | Identificar los PRs de agentes (autor de tipo bot o línea de coautoría) para separarlos en las métricas | Podría |

## Requisitos no funcionales

- RNF-S5-01 La acumulación de líneas es idempotente: reenviar el mismo evento no suma líneas dos veces.
- RNF-S5-02 El log de auditoría es de solo agregar: ninguna ruta de la API actualiza ni borra eventos.
- RNF-S5-03 Cada aviso explica su motivo (qué PR, qué archivo, cuántas líneas o excepciones) para que revisarlo sea rápido.
- RNF-S5-04 Si la API de GitHub no responde, no se marca nada y el error se registra: se prefiere un aviso que falta a uno falso.
- RNF-S5-05 El panel responde en menos de 500 ms con hasta 10.000 evaluaciones por workspace.
- RNF-S5-06 El resumen semanal se envía solo si hay pendientes, la configuración del correo viene de variables de entorno y cada miembro puede desactivarlo en su perfil.
- RNF-S5-07 La exportación usa el mismo Markdown que se guarda, sin conversión con pérdida.
- RNF-S5-08 La consulta de archivos de cada PR se hace una sola vez y se reutiliza para el check, la vigencia y los borradores.

## Interfaces

- `GET /api/workspaces/:id/metrics?days=`
- `GET /api/workspaces/:id/audit` (con filtros) y `GET /api/workspaces/:id/audit/export?format=csv|json`
- `POST /api/workspaces/:id/decisions/:number/review` (acción "Sigue vigente")
- `PATCH /api/workspaces/:id` (configuración, solo owner)
- `GET /api/workspaces/:id/coverage` y `GET /api/workspaces/:id/export` (.zip)
- Tarea programada semanal para el resumen por email; el webhook también procesa todos los PRs mergeados (evento pull_request, acción closed), no solo los etiquetados
- Externa: `GET /repos/{owner}/{repo}/pulls/{n}/files` y el árbol de carpetas de la API de GitHub

## Criterios de aceptación

1. Dada una decisión con alcance `src/db/**` y un umbral de 30, cuando se mergea un PR que cambia 12 líneas de ese alcance, no hay aviso; cuando otro PR cambia 20 más, aparece el aviso con su motivo.
2. Dado un archivo del alcance que se elimina en un PR mergeado, el aviso aparece de inmediato.
3. Dada una decisión con dos excepciones registradas en 30 días, aparece "Para revisar" con el motivo "excepciones repetidas".
4. Dada la acción "Sigue vigente", el aviso desaparece y los contadores vuelven a cero.
5. Dado el mismo evento de PR recibido dos veces, las líneas acumuladas no se duplican.
6. Dado el log de auditoría, no existe ninguna operación de la API que modifique o borre un evento, y un test lo comprueba.
7. Dado un workspace con 3 respuestas registradas, la exportación CSV de la auditoría contiene 3 filas de respuesta con actor, motivo, PR y fecha.
8. Dado un workspace con 2 borradores pendientes y 1 aviso, el resumen semanal los lista; sin pendientes, no se envía nada.
9. Dado un workspace con 5 PRs evaluados, 3 que tocaron decisiones y 2 respondidos, el panel muestra 5, 3 y 2.
10. Dada la exportación completa, el .zip contiene un archivo por decisión con su metadato al inicio y su contenido original.

## Definición de hecho

- [ ] La regla de vigencia está escrita en el README con un ejemplo numérico
- [ ] Hay tests para el umbral, el archivo eliminado, las excepciones repetidas, la reentrega, "Sigue vigente" y el log de solo agregar
- [ ] El panel y la exportación de auditoría se pueden mostrar de punta a punta
- [ ] Demo de tres minutos: un PR dispara el check, se responde con una excepción y aparece en el panel y en la auditoría

**Qué practicás.** Reglas de negocio simples y explicables, estado derivado, agregaciones SQL, logs inmutables, tareas programadas y exportación de datos.
