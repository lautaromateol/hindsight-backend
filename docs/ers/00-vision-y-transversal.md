# Escolio v2: ERS de decisiones aplicadas a cada PR

Escolio convierte las decisiones técnicas de un equipo en reglas verificables: cada PR, escrito por una persona o por un agente de IA, recibe en GitHub un chequeo que lista las decisiones que toca y exige una respuesta registrada.

## Visión y alcance

Escolio ataca un cuello de botella nuevo: la IA escribe código más rápido de lo que un equipo puede revisarlo, y las reglas que deberían guiar esa revisión viven en la cabeza de dos o tres personas.

**El problema.** Un agente de código o un dev nuevo rompe sin saberlo una decisión que el equipo tomó hace meses (por qué PostgreSQL, qué capa no se toca). La revisión humana no escala al volumen de PRs, y los revisores automáticos juzgan el diff, no las reglas propias del equipo. Nadie se entera hasta que algo falla.

**Por qué ahora.**

| Dato | Fuente |
| --- | --- |
| La IA escribió el 51,9% del código en los datos preliminares de DX del segundo trimestre de 2026; Sonar lo ubica en 42% del código commiteado (enero de 2026) y proyecta 65% para 2027 | [Votazz, julio de 2026](https://votazz.co/2026/07/07/ai-code-review-bottleneck/) |
| El 61% de los PRs abiertos por agentes de IA no recibe ninguna revisión, según un estudio revisado por pares (EASE 2026, arXiv 2605.02273) | [Votazz, julio de 2026](https://votazz.co/2026/07/07/ai-code-review-bottleneck/) |
| Faros AI, con datos de 22.000 desarrolladores en más de 4.000 equipos: los PRs mergeados sin revisión subieron 31,3%, la relación entre incidentes y PRs subió 242,7% y el tiempo mediano en revisión subió 441,5% | [HackerNoon, agosto de 2026](https://hackernoon.com/ai-is-writing-more-codeand-creating-a-review-bottleneck) |
| El 96% de los desarrolladores no confía plenamente en el código generado por IA y solo el 48% lo verifica siempre (Sonar, 1.100 desarrolladores) | [HackerNoon, agosto de 2026](https://hackernoon.com/ai-is-writing-more-codeand-creating-a-review-bottleneck) |
| CodeRabbit levantó 143 millones de dólares a una valuación de 1.500 millones en agosto de 2026 y lanzó Agentic Change Management, una capa de gobernanza para cambios de agentes; declara 17.000 clientes | [InforCapital](https://inforcapital.com/companies/coderabbit/) |
| Entre abril y septiembre de 2026 se invirtieron 435 millones de dólares en 12 financiamientos de seguridad y gobernanza de agentes empresariales | [Forkast, septiembre de 2026](https://forkast.news/enterprise-ai-agent-funding-surges-to-435m-in-five-months-security-and-governance-lead/) |

Son cifras de terceros, tomadas de artículos secundarios consultados el 28 de octubre de 2026 (Forkast se presenta como un medio escrito por IA); conviene contrastarlas con los informes originales antes de presentarlas.

**Qué es Escolio.**

1. **Decisiones con alcance.** Cada decisión aceptada declara qué rutas cubre (patrones glob) y si exige respuesta.
2. **Un check en el PR.** Cuando un PR toca ese alcance, GitHub muestra un chequeo de Escolio que queda pendiente hasta que un miembro responda: sigue vigente, excepción con motivo o reemplazo. Todo queda registrado.
3. **Una superficie para agentes.** Un servidor MCP de solo lectura y un `AGENTS.md` generado, para que el agente conozca las reglas antes de escribir.

Escolio no compite en revisar el diff con IA: es la fuente de reglas escritas por humanos que cualquier revisor, humano o IA, puede consultar.

**Usuarios.**

- Tech lead o CTO: quiere que ningún cambio importante pase sin que alguien responda por la decisión original, y poder demostrarlo.
- Dev del equipo: ve en el PR qué decisión toca y responde en menos de 30 segundos sin salir de GitHub.
- Agente de IA: consulta las reglas antes de escribir código, por MCP o desde `AGENTS.md`.
- Dev nuevo: entiende por qué el sistema es como es sin interrumpir a nadie.

**Entra en el MVP.**

- Cuentas, workspaces por equipo e invitación por código (la autenticación la resuelve Clerk y la creación de workspaces ya existe en el backend).
- Decisiones con contexto, estados, etiquetas, Markdown y alcance por patrones de ruta.
- GitHub App con un check de decisiones en cada PR y respuestas desde GitHub, con botón y con comandos.
- Borradores de decisión desde PRs mergeados con la etiqueta `decision`.
- Servidor MCP de solo lectura, tokens de agente y `AGENTS.md` generado.
- Auditoría exportable, panel de métricas y aviso de decisiones "para revisar".
- Exportación completa a Markdown.

**Queda fuera (roadmap).** Verificación semántica con IA de si un diff contradice una decisión (con evidencia citada), resúmenes de PRs con IA, soporte para GitLab y Bitbucket, integración con Slack, SSO y permisos granulares por rol, grafo de decisiones, rutas de onboarding, extensión de VS Code, edición colaborativa en tiempo real, app móvil y facturación.

**Modelo de negocio (hipótesis).** Gratis para repositorios públicos y para un workspace pequeño, un plan de equipo por workspace con precio público y un plan superior con auditoría exportable y SSO. Es una hipótesis para validar, no un dato.

**Criterios de éxito.**

1. Un check de Escolio aparece en GitHub en menos de 15 segundos desde que se abre un PR que toca una decisión.
2. Un miembro responde al check desde GitHub en menos de 30 segundos.
3. Registrar una decisión toma menos de un minuto.
4. El flujo completo (PR de un agente, check, excepción, auditoría) funciona de punta a punta en un entorno público.
5. Un agente de IA obtiene las decisiones que cubren una ruta con una sola consulta MCP.
6. Escolio protege su propio repositorio, con al menos 8 decisiones reales registradas.

**Supuesto de planificación.** Seis sprints de una semana con una sola persona. La autenticación la resuelve Clerk y la creación de workspaces ya existe, según lo informado, así que el sprint 1 es corto. Pregunta abierta: ¿cuál es la fecha de entrega? Con ese dato se ajusta la duración de cada sprint.

## Plan de sprints

Son seis sprints de una semana y cada uno termina con algo que se puede demostrar; lo que diferencia a Escolio, el check en el PR y la superficie para agentes, llega en los sprints 3 y 4.

| Sprint | Semana | Entrega |
| --- | --- | --- |
| Sprint 1: Fundaciones | 1 | Login, workspaces, invitación y perfil GitHub |
| Sprint 2: Decisiones | 2 | Decisiones con alcance, estados y búsqueda |
| **Sprint 3: Check en PR** | 3 | GitHub App y check de decisiones en cada PR |
| **Sprint 4: Agentes** | 4 | Borradores desde PRs, MCP y AGENTS.md |
| Sprint 5: Gobernanza | 5 | Panel, auditoría y vigencia de decisiones |
| Sprint 6: Entrega | 6 | Tests, despliegue, datos de ejemplo y demo ensayada |

Los sprints 3 y 4 son el diferencial. Supuesto: un sprint por semana, una persona desarrollando.

Los sprints se encadenan: cada uno necesita lo que dejó el anterior, así que conviene respetar el orden.

## ERS transversal

Esta sección fija las convenciones, los actores, el modelo de datos y los requisitos no funcionales que valen para los seis sprints; cada sprint agrega su propia ERS encima.

**Cómo leer las ERS.** Cada sprint tiene objetivo, alcance, requisitos funcionales (RF), requisitos no funcionales (RNF), interfaces, criterios de aceptación y definición de hecho. Los requisitos se identifican como `RF-S3-05` (sprint 3, requisito 5) y se redactan como "El sistema deberá…". Llevan una prioridad: **Debe** (sin esto el sprint no cierra), **Debería** (se hace si hay tiempo) o **Podría** (lo primero que se recorta).

**Stack asumido.** React con Vite en el cliente, Node con Express en el servidor, PostgreSQL y una GitHub App. La cola de trabajos vive en PostgreSQL, sin servicios extra. Las ERS no dependen de librerías concretas: conviene registrar cada elección como decisión dentro de Escolio.

> Nota: el frontend real del proyecto usa Next.js, no React con Vite.

**Comandos en PRs.** Los comentarios con comandos usan el prefijo `/escolio` y van sin tildes: `/escolio excepcion <motivo>`, `/escolio reemplazar #N`, `/escolio confirmar` y `/escolio descartar`.

**Actores.**

- Visitante: persona sin sesión; solo puede registrarse o iniciar sesión.
- Miembro: usuario de un workspace; crea, edita y consulta decisiones y responde checks desde GitHub.
- Owner: miembro que además instala la GitHub App, activa repositorios, configura los valores predeterminados del workspace, administra tokens de agente y elimina decisiones ajenas.
- GitHub: sistema externo que envía eventos firmados y recibe checks y comentarios.
- Agente de IA: cliente que consulta las decisiones por MCP con un token de solo lectura; no escribe nada en Escolio.

**Glosario.**

- Decisión: registro de una elección técnica con su contexto, lo decidido y las alternativas descartadas.
- Alcance: lista de patrones glob de rutas, para incluir o excluir, a los que aplica una decisión.
- Modo de aplicación: informativo (el check informa y no bloquea) o requiere respuesta (el check queda pendiente hasta que alguien responda).
- Check de decisiones: chequeo que Escolio crea en cada PR de un repositorio activo.
- Evaluación: resultado de comparar los archivos de un PR con los alcances de las decisiones.
- Respuesta: acción registrada sobre un PR: sigue vigente, excepción (con motivo) o reemplazo.
- Borrador: decisión creada desde un PR marcado con la etiqueta `decision` que todavía nadie confirmó.
- Para revisar: decisión que puede haber quedado desactualizada por cambios en su alcance, excepciones repetidas o una fecha de revisión vencida.
- Token de agente: credencial de solo lectura para que un agente de IA consulte las decisiones del workspace.

**Modelo de datos conceptual.**

| Entidad | Para qué sirve | Campos principales | Sprint |
| --- | --- | --- | --- |
| Usuario | Persona que inicia sesión | nombre, email, identificador de Clerk, usuario de GitHub (opcional) | 1 |
| Workspace | Espacio de un equipo | nombre, código de invitación, valores predeterminados | 1 (valores en 5) |
| Membresía | Une usuarios con workspaces | usuario, workspace, rol (owner o miembro) | 1 |
| Decisión | Registro de un porqué técnico | número por workspace, título, contexto, decisión, alternativas, consecuencias, estado, etiquetas, autor, reemplaza a, modo de aplicación, fecha de revisión | 2 |
| Alcance | Rutas que cubre una decisión | decisión, patrón glob, tipo (incluir o excluir) | 2 |
| Instalación de GitHub | Vincula la App con un workspace | workspace, id de instalación, cuenta | 3 |
| Repositorio | Repo activo para evaluar | workspace, instalación, owner/nombre, activo | 3 |
| Evaluación de PR | Resultado de comparar un PR con los alcances | repositorio, número de PR, SHA, decisiones coincidentes, estado, id del check | 3 |
| Respuesta | Acción de un miembro sobre un PR | evaluación, decisión, tipo, motivo, usuario de GitHub, usuario de Escolio, fecha | 3 |
| Trabajo en cola | Procesamiento asíncrono de eventos | tipo, id de entrega de GitHub, carga, estado, intentos | 3 |
| Token de agente | Acceso de solo lectura para agentes | workspace, nombre, hash, último uso, revocado | 4 |
| Evento de auditoría | Registro inmutable de lo ocurrido | workspace, tipo, actor, objeto, detalle, fecha | 5 |
| Revisión de vigencia | Datos de "para revisar" dentro de la decisión | líneas acumuladas, excepciones recientes, motivo, fecha de revisión | 5 |

**Requisitos no funcionales transversales.**

- RNF-T-01 Aislamiento: toda consulta se filtra por la membresía del usuario; ningún dato de un workspace es accesible desde otro. La seguridad por filas de PostgreSQL refuerza el filtro.
- RNF-T-02 Seguridad: las credenciales las custodia Clerk, los secretos (incluida la clave privada de la GitHub App) viven en variables de entorno y el contenido Markdown se sanitiza al mostrarlo.
- RNF-T-03 Privacidad del código: Escolio nunca descarga ni guarda el contenido del código; solo rutas, líneas agregadas y eliminadas y metadatos de PR.
- RNF-T-04 Permisos mínimos: la GitHub App pide solo lectura de metadatos y de PRs, escritura de checks y escritura de comentarios en PRs.
- RNF-T-05 Falla abierta: ante un error propio o de GitHub, el check termina neutral con una explicación; Escolio nunca bloquea un merge por una falla suya.
- RNF-T-06 Rendimiento: listas y búsquedas responden en menos de 500 ms con hasta 1.000 decisiones por workspace, y el check aparece en menos de 15 segundos (percentil 95) desde el evento.
- RNF-T-07 Usabilidad: las acciones frecuentes (crear una decisión, responder un check, confirmar un borrador) se completan en 30 segundos o menos y se pueden hacer con teclado.
- RNF-T-08 Compatibilidad: últimas dos versiones de Chrome, Firefox y Safari; usable desde 360 px de ancho.
- RNF-T-09 Calidad: cada sprint entrega tests automatizados de su API y un README actualizado.
- RNF-T-10 Portabilidad: el contenido se guarda como Markdown, sin formatos propietarios, y se exporta completo.
- RNF-T-11 Mínima fricción: ninguna función obliga al equipo a cambiar cómo ya trabaja; lo automático se propone y la persona solo confirma o corrige.
- RNF-T-12 Observabilidad: los logs son estructurados, llevan el id de entrega de GitHub y nunca incluyen secretos.
