# Sprint 2: decisiones con alcance

Al cerrar este sprint, un miembro puede registrar una decisión con su alcance en menos de un minuto, editarla, cambiar su estado y encontrar qué decisiones cubren una ruta dada.

**Alcance.** Incluye el CRUD de decisiones, los estados, las etiquetas, el editor Markdown con vista previa, el alcance por patrones glob, el modo de aplicación, la captura rápida y la búsqueda. No incluye GitHub (sprint 3), borradores desde PRs ni acceso para agentes (sprint 4).

## Requisitos funcionales

| ID | El sistema deberá… | Prioridad |
| --- | --- | --- |
| RF-S2-01 | Permitir crear una decisión con título y contexto obligatorios; decisión, alternativas descartadas, consecuencias y etiquetas son opcionales pero recomendados (el formulario los sugiere sin bloquear el guardado) | Debe |
| RF-S2-02 | Numerar las decisiones de forma consecutiva por workspace (#1, #2…), sin repetir números aunque dos personas guarden a la vez | Debe |
| RF-S2-03 | Manejar los estados borrador, propuesta, aceptada, reemplazada y obsoleta; el estado inicial por defecto es aceptada | Debe |
| RF-S2-04 | Permitir definir el alcance de una decisión como una lista de patrones glob de rutas (por ejemplo `src/db/**`) con patrones de exclusión; rechazar patrones vacíos y advertir cuando uno cubre todo el repositorio | Debe |
| RF-S2-05 | Permitir elegir el modo de aplicación de cada decisión: informativo (predeterminado) o requiere respuesta | Debe |
| RF-S2-06 | Mostrar el detalle de una decisión con sus campos renderizados desde Markdown, sin ejecutar HTML ni scripts del contenido | Debe |
| RF-S2-07 | Permitir editar una decisión y eliminarla con confirmación; solo el autor o un owner puede eliminarla | Debe |
| RF-S2-08 | Listar las decisiones por fecha de actualización, con filtros por estado, por etiqueta y por ruta (las decisiones que cubren una ruta dada) | Debe |
| RF-S2-09 | Buscar texto completo en título, contexto, decisión, alternativas y etiquetas, ordenado por relevancia | Debería |
| RF-S2-10 | Permitir indicar qué decisión reemplaza a otra; la anterior pasa a reemplazada y muestra "reemplazada por #N" | Debería |
| RF-S2-11 | Aceptar etiquetas libres, normalizadas a minúsculas, hasta 8 por decisión | Debería |
| RF-S2-12 | Ofrecer captura rápida: un botón o atajo de teclado abre el formulario mínimo y Ctrl/Cmd+Enter guarda | Debería |
| RF-S2-13 | Ofrecer un probador de alcance: ingresar una ruta y ver qué decisiones la cubren | Podría |

## Requisitos no funcionales

- RNF-S2-01 Guardar una decisión responde en menos de 500 ms en condiciones normales.
- RNF-S2-02 El formulario mínimo se puede completar solo con teclado.
- RNF-S2-03 Cada campo de texto tiene un límite de tamaño (por ejemplo, 20.000 caracteres) y cada decisión admite hasta 20 patrones, todo validado en el servidor.
- RNF-S2-04 El contenido se guarda como Markdown plano, sin formato propietario.
- RNF-S2-05 La coincidencia de patrones usa una única librería de glob, compartida entre la API de rutas y el check del sprint 3, con la misma configuración, para que el probador y el check siempre coincidan.

## Interfaces (API REST)

- `GET /api/workspaces/:id/decisions` (con filtros `status`, `tag` y `path`) y `POST /api/workspaces/:id/decisions`
- `GET`, `PATCH` y `DELETE /api/workspaces/:id/decisions/:number`
- `GET /api/workspaces/:id/tags`
- `GET /api/workspaces/:id/search?q=`
- `POST /api/workspaces/:id/scope-test` (ruta de ejemplo y decisiones que la cubren)

## Criterios de aceptación

1. Dado un formulario con solo título y contexto, cuando se guarda, la decisión se crea; si falta el título o el contexto, se indica cuál y no se crea.
2. Dadas dos decisiones creadas a la vez en el mismo workspace, sus números son consecutivos y distintos.
3. Dado un contenido con `<script>alert(1)</script>`, cuando se abre la decisión, el script no se ejecuta.
4. Dada una decisión con alcance `src/db/**`, cuando se filtra por la ruta `src/db/users.ts`, aparece; con la ruta `src/ui/app.tsx`, no aparece.
5. Dado un patrón de exclusión `src/db/legacy/**`, la ruta `src/db/legacy/old.ts` no coincide con la decisión.
6. Dado que la decisión #7 reemplaza a la #3, la #3 aparece como reemplazada por #7.
7. Dado un usuario de otro workspace, no puede ver, editar, eliminar ni buscar la decisión.
8. Dado un miembro que no es el autor ni owner, el intento de eliminar una decisión se rechaza.
9. Dada la búsqueda "cache", aparecen las decisiones que la mencionan en cualquier campo y las que la tienen en el título van primero.

## Definición de hecho

- [ ] Se puede crear una decisión con solo título y contexto en menos de un minuto
- [ ] La numeración se probó con dos pedidos simultáneos
- [ ] Hay tests de API para el CRUD, la numeración, los permisos y la coincidencia de alcance (incluida la exclusión)
- [ ] El contenido malicioso en Markdown se probó y no se ejecuta
- [ ] Demo de tres minutos: crear con alcance, editar, filtrar por ruta y reemplazar una decisión

**Qué practicás.** CRUD REST, formularios controlados, caché de datos con TanStack Query, concurrencia al numerar, coincidencia de patrones glob, seguridad frente a XSS y búsqueda de texto completo en PostgreSQL.
