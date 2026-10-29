# Riesgos y orden de recorte

Si el tiempo se acorta, un MVP defendible son los sprints 1 a 3 más el servidor MCP y un panel mínimo: ahí está lo que diferencia a Escolio de un revisor con IA y de una wiki.

| Riesgo | Mitigación |
| --- | --- |
| Los webhooks y la GitHub App son difíciles de probar en local | Usar un túnel (ngrok o similar), guardar payloads de ejemplo con un script que los envíe firmados y probar con un repositorio propio |
| La GitHub App consume más tiempo del previsto | Construir primero el sprint 2, probar el sprint 3 con un repositorio propio y empezar por el modo informativo antes de sumar "requiere respuesta" |
| El check genera ruido por falsos positivos | Alcance explícito por patrones, modo informativo por defecto, "Sigue vigente" en un clic y falla abierta |
| Un competidor grande amplía su gobernanza (CodeRabbit ya lanzó una capa de gestión de cambios de agentes) | Posicionarse como la fuente neutral de reglas escritas por humanos que otros revisores consultan por MCP, sin competir en revisar el diff con IA |
| Sin tracción, la historia depende de la demo | Usar Escolio sobre su propio repositorio desde el sprint 3 y sumar dos o tres repositorios reales de prueba antes de la convención |
| La entrada gratuita para código abierto ya la ofrece CodeRabbit | Tratarla como canal de adopción y no como ventaja; la ventaja es el registro auditable de decisiones |
| Alguien declara en su perfil el usuario de GitHub de otra persona | Unicidad entre cuentas, verificación por OAuth (RF-S1-10) y registro de quién respondió en la auditoría |
| Una decisión mal escrita o maliciosa induce a un agente a actuar mal | El MCP entrega el contenido marcado como datos, solo de decisiones aceptadas y propuestas, y solo los miembros crean decisiones |
| La API de GitHub limita los pedidos | Tokens de instalación, un solo pedido de archivos por PR reutilizado y respeto de los límites de tasa |
| Un sprint se atrasa y hay una sola persona desarrollando | Congelar el alcance a mitad de sprint y recortar según el orden de abajo |
| La demo en vivo falla | Datos de ejemplo cargados, script de demostración y un video de respaldo |
| Las cifras de mercado vienen de fuentes secundarias | Contrastarlas con los informes originales antes de presentarlas |

**Orden de recorte** (lo primero que se saca va arriba):

1. Idioma de la interfaz (RF-S6-07)
2. Abrir un PR con `AGENTS.md` actualizado (RF-S4-13)
3. Identificar los PRs de agentes (RF-S5-14)
4. Comentario resumen en el PR (RF-S3-17)
5. Probador de alcance (RF-S2-13)
6. Panel de cobertura (RF-S5-13)
7. Enlaces y backlinks entre decisiones (RF-S4-11)
8. Prellenado por secciones del PR (RF-S4-10)
9. Fecha de revisión (RF-S5-09)
10. Resumen semanal por email (RF-S5-11)
11. Configuración del owner (RF-S5-10); quedan los valores predeterminados
12. Verificación del usuario de GitHub por OAuth (RF-S1-10)
13. Comandos `/escolio confirmar` y `/escolio descartar` (RF-S4-09); la bandeja los reemplaza
14. Reemplazar desde GitHub (RF-S3-14)
15. Exportación completa a Markdown (RF-S5-12)

No se recortan: autenticación y aislamiento por workspace, decisiones con alcance y modo de aplicación, la GitHub App con el check, las respuestas y su registro, la falla abierta, los borradores a pedido con su bandeja, el servidor MCP con tokens, la auditoría con su exportación, el panel de métricas y la vigencia por líneas y por excepciones.

## De la versión anterior a esta

Se conserva todo lo construido y la mayor parte del plan anterior; cambia la interfaz principal, que pasa de una bandeja en la app a un check dentro del PR.

| Elemento del plan anterior | Qué pasa en esta versión |
| --- | --- |
| Autenticación (Clerk) y workspaces (ya construidos) | Se conservan sin cambios en el sprint 1 |
| Decisiones con estados, etiquetas y Markdown | Se conservan y suman alcance por patrones y modo de aplicación (sprint 2) |
| Borradores desde PRs y confirmación | Se conservan y pasan al sprint 4; ahora proponen el alcance (RF-S4-02) |
| Obsolescencia por líneas acumuladas | Se conserva en el sprint 5 y suma excepciones repetidas y fecha de revisión |
| Comentario del bot en el PR | El check pasa a ser la interfaz principal; el comentario queda para avisar de borradores |
| Webhook por workspace con secreto manual | Se reemplaza por una GitHub App con un único webhook |
| Enlaces, backlinks y búsqueda | Se conservan con menor prioridad (RF-S2-09, RF-S4-11) |
| Grafo, rutas de onboarding y progreso de lectura | Salen al roadmap |
| Exportación a Markdown | Sube de Podría a Debería (RF-S5-12) |

## Fuentes

Páginas abiertas el 28 de octubre de 2026 para las cifras de la visión. Son artículos secundarios: los informes originales de Faros AI, Sonar, DX, LinearB y el estudio EASE 2026 no se consultaron directamente.

- [AI Writes Half Your Code Now. So Why Are Your Pull Requests Slower?](https://votazz.co/2026/07/07/ai-code-review-bottleneck/), Votazz, 7 de julio de 2026: reúne datos de DX, Sonar, LinearB y el estudio EASE 2026
- [AI Is Writing More Code, And Creating a Review Bottleneck](https://hackernoon.com/ai-is-writing-more-codeand-creating-a-review-bottleneck), HackerNoon, 20 de agosto de 2026: informe de Faros AI y encuesta de Sonar
- [CodeRabbit, perfil de financiación](https://inforcapital.com/companies/coderabbit/), InforCapital: serie C, valuación, clientes y Agentic Change Management
- [Enterprise AI Agent Funding Surges to $435M in Five Months](https://forkast.news/enterprise-ai-agent-funding-surges-to-435m-in-five-months-security-and-governance-lead/), Forkast, 9 de septiembre de 2026
