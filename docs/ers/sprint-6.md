# Sprint 6: pruebas, despliegue y entrega

Al cerrar este sprint, el MVP funciona de punta a punta en una URL pública, protege su propio repositorio, tiene datos de ejemplo y una demo ensayada con el escenario del agente.

**Alcance.** Incluye pulido de la experiencia, pruebas automáticas en integración continua, revisión de seguridad (incluida la GitHub App), documentación, preparación de la defensa y material de presentación. No agrega funcionalidades nuevas salvo las marcadas como Podría.

## Requisitos funcionales

| ID | El sistema deberá… | Prioridad |
| --- | --- | --- |
| RF-S6-01 | Mostrar un estado vacío con una acción sugerida, un indicador de carga y un mensaje de error claro en cada pantalla | Debe |
| RF-S6-02 | Cerrar la sesión y volver a /login cuando la sesión de Clerk vence, sin perder el aviso al usuario | Debe |
| RF-S6-03 | Incluir un script que cree un workspace de ejemplo con unas 15 decisiones con alcance, un par de borradores, evaluaciones de PRs y entradas de auditoría | Debe |
| RF-S6-04 | Incluir un script de demostración que abra, en un repositorio de prueba, un PR que toque el alcance de una decisión, para repetir el escenario del agente sin depender de nadie | Debe |
| RF-S6-05 | Registrar y proteger con Escolio el propio repositorio del proyecto, con al menos 8 decisiones reales | Debe |
| RF-S6-06 | Mostrar en ajustes una guía paso a paso para instalar la GitHub App, activar repositorios, crear un token de agente y exigir el check en la protección de rama | Debería |
| RF-S6-07 | Permitir cambiar el idioma de la interfaz entre español e inglés | Podría |

## Requisitos no funcionales

- RNF-S6-01 Hay tests automáticos para autenticación, aislamiento entre workspaces, numeración, coincidencia de alcance, webhook y check, respuestas, borradores, MCP y vigencia, y corren en integración continua en cada push.
- RNF-S6-02 Revisión de seguridad: cabeceras de seguridad, CORS restringido al dominio del cliente, sin secretos en el repositorio ni en su historial, sin vulnerabilidades críticas conocidas en las dependencias y permisos de la GitHub App revisados contra RNF-T-04.
- RNF-S6-03 Las pantallas son usables desde 360 px de ancho.
- RNF-S6-04 Accesibilidad básica: navegación por teclado, contraste suficiente y etiquetas en los formularios.
- RNF-S6-05 Las variables de entorno están documentadas, las migraciones se aplican en el despliegue, la base de datos tiene respaldo y existe un procedimiento escrito para rotar la clave de la App y los tokens.
- RNF-S6-06 En el entorno público, el check aparece en menos de 15 segundos con el repositorio de prueba, medido en cinco corridas consecutivas.

## Criterios de aceptación

1. Dada una persona sin contexto, cuando sigue el README, levanta el proyecto en menos de 15 minutos.
2. Dado el entorno público, el flujo completo funciona: registro, workspace, decisión con alcance, PR de un agente que la toca, check pendiente, excepción, auditoría y aviso de vigencia.
3. Dado un push a la rama principal, todos los tests pasan en la integración continua.
4. Dada una sesión de Clerk vencida, la aplicación lleva a /login en lugar de mostrar errores técnicos.
5. Dado el script de demostración, corre dos veces seguidas sin dejar el repositorio de prueba en un estado inconsistente.
6. Dado un PR en el propio repositorio del proyecto, el check de Escolio aparece.

## Definición de hecho

- [ ] README con problema, arquitectura, instrucciones de instalación y decisiones técnicas
- [ ] Al menos 8 decisiones reales del propio proyecto registradas dentro de Escolio, con su alcance
- [ ] Guion de la demo de 5 minutos ensayado, con el escenario del agente
- [ ] Video corto de respaldo por si falla la demo en vivo
- [ ] Material de presentación: una diapositiva de problema con cifras citadas, una de competencia y posicionamiento, una de modelo de negocio y una de demo
- [ ] Lista de mejoras futuras (el roadmap) escrita
- [ ] Cifras de mercado contrastadas con sus fuentes originales antes de presentarlas

**Qué practicás.** Pruebas automatizadas, integración continua, seguridad básica de una aplicación web y de una GitHub App, despliegue y cómo presentar un proyecto ante inversores.
