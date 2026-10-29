# Seguridad por filas (RNF-T-01)

PostgreSQL refuerza el filtro por membresía de cada consulta. La migración `row_level_security` activa RLS en `Workspace` y `Member`.

## Cómo funciona

- Cada controlador abre `withUser(userId, fn)` ([src/lib/prisma.ts](../src/lib/prisma.ts)), que fija `app.user_id` dentro de la transacción. Las políticas leen ese valor.
- Se ve un workspace si el usuario es miembro. Solo el owner lo modifica o lo elimina.
- Al unirse, la API fija también `app.invite_code`: queda visible únicamente el workspace con ese código, y solo se puede insertar la propia membresía como `MEMBER`.
- Las membresías no se actualizan ni se borran por la API (sin política). Al eliminar un workspace se borran en cascada.
- Las funciones `app_*` son `SECURITY DEFINER` para que las políticas de `Member` no se llamen a sí mismas.
- Cada tabla nueva con datos de un workspace necesita sus políticas en la misma migración.

## Rol de la API

Las políticas **no rigen** para el dueño de las tablas ni para roles con `BYPASSRLS` (por ejemplo, el rol por defecto de varios proveedores). La API tiene que conectarse con un rol sin esos privilegios:

```sql
CREATE ROLE escolio_app LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
```

Crealo antes de correr `npm run db:deploy`: la migración le da permisos si el rol existe (si lo creás después, otorgá `SELECT, INSERT, UPDATE, DELETE` sobre las tablas de `public`).

- `DATABASE_URL`: rol `escolio_app` (la API).
- `MIGRATION_DATABASE_URL`: dueño de las tablas (`db:migrate`, `db:deploy`).

Al arrancar, la API avisa en el log (`rls_bypassed`) si su rol esquiva las políticas.

## Tests

`npm test` usa una base en memoria que imita las políticas. Las políticas reales se prueban con `RLS_TEST_DATABASE_URL` (base de pruebas migrada, rol `escolio_app`); sin esa variable el test se omite:

```
RLS_TEST_DATABASE_URL=... DATABASE_URL=... node --import tsx --test test/rls.test.ts
```
