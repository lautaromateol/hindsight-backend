# Sprint 1: fundaciones, autenticación y workspaces

Al cerrar este sprint, una persona puede registrarse, crear un workspace o unirse a uno con un código, registrar su usuario de GitHub y entrar a una pantalla protegida, con el proyecto desplegado.

**Estado de partida.** Según lo informado, el registro y el login los resuelve Clerk (decisión vigente) y ya existen las rutas de creación de workspaces. Falta el cliente, la invitación por código, el perfil con usuario de GitHub y el despliegue.

**Alcance.** Incluye la estructura del repositorio (cliente y servidor), la base de datos con migraciones, el registro y login con Clerk, los workspaces con invitación por código, el perfil y un primer despliegue. No incluye decisiones ni GitHub.

## Requisitos funcionales

| ID | El sistema deberá… | Prioridad |
| --- | --- | --- |
| RF-S1-01 | Permitir el registro mediante Clerk (nombre, email y contraseña); las reglas de contraseña y la unicidad del email las aplica Clerk | Debe |
| RF-S1-02 | Permitir iniciar sesión mediante Clerk, que emite la sesión y su token con el vencimiento configurado en Clerk | Debe |
| RF-S1-03 | Redirigir a /login cuando no hay sesión de Clerk válida y cerrar la sesión de Clerk al salir | Debe |
| RF-S1-04 | Permitir crear un workspace con nombre; quien lo crea queda como owner | Debe |
| RF-S1-05 | Generar un código de invitación por workspace y permitir que un usuario autenticado se una ingresándolo | Debe |
| RF-S1-06 | Rechazar con 403 o 404 cualquier pedido a un workspace del que el usuario no es miembro | Debe |
| RF-S1-07 | Permitir que cada usuario registre su usuario de GitHub en su perfil, único entre cuentas, para reconocerlo cuando responda desde un PR | Debe |
| RF-S1-08 | Permitir que un usuario pertenezca a varios workspaces y cambiar de uno a otro | Debería |
| RF-S1-09 | Listar los miembros de un workspace con su rol y su usuario de GitHub | Debería |
| RF-S1-10 | Verificar que el usuario de GitHub declarado es de quien lo declara, mediante OAuth | Debería |

## Requisitos no funcionales

- RNF-S1-01 Las credenciales las custodia Clerk; el sistema nunca almacena contraseñas ni las escribe en logs.
- RNF-S1-02 Todo dato de entrada se valida en el servidor y los errores usan un formato uniforme, por ejemplo `{ error: { code, message } }`.
- RNF-S1-03 El login limita los intentos fallidos mediante la protección de Clerk.
- RNF-S1-04 La configuración (claves de Clerk, URL de la base) viene de variables de entorno y no se sube al repositorio.
- RNF-S1-05 El flujo OAuth usa un parámetro `state` para evitar CSRF.

## Interfaces (API REST)

- Registro e inicio de sesión: los resuelve Clerk en el cliente, sin endpoints propios; la API identifica al usuario por el token de sesión de Clerk
- `GET /api/auth/me`, `PATCH /api/auth/me` (perfil, usuario de GitHub; a confirmar con el backend)
- `GET /api/workspaces`, `POST /api/workspaces`, `POST /api/workspaces/join`
- `GET /api/workspaces/:id/members`
- `GET /api/auth/github` y `GET /api/auth/github/callback` (verificación, RF-S1-10)

## Criterios de aceptación

1. Dado un email ya registrado, cuando alguien intenta registrarse con el mismo, Clerk lo rechaza con un mensaje claro y no se crea otro usuario.
2. Dado un usuario con sesión, cuando recarga la página, sigue autenticado hasta que la sesión de Clerk vence.
3. Dado un usuario que no es miembro del workspace 5, cuando pide `GET /api/workspaces/5/members`, recibe 403 o 404.
4. Dado un código de invitación válido, cuando un usuario lo ingresa, queda como miembro (no owner) del workspace.
5. Dada una contraseña que no cumple las reglas de Clerk, el registro se rechaza con un mensaje en español que indica el motivo.
6. Dado un usuario de GitHub que ya usa otra cuenta, cuando un segundo usuario intenta registrarlo, recibe un error 409.

## Definición de hecho

- [ ] El README explica cómo instalar y correr el proyecto en cinco comandos o menos
- [ ] Las migraciones de base de datos están versionadas y se aplican de forma repetible
- [ ] Hay tests de API para la identificación del usuario con el token de Clerk y el aislamiento entre workspaces
- [ ] El proyecto está desplegado con una URL pública
- [ ] Demo de tres minutos: registro, creación de workspace, invitación y usuario de GitHub

**Qué practicás.** Modelado relacional, integración con Clerk (sesiones y verificación de su token en la API), middlewares de Express, rutas protegidas en Next.js y despliegue.
