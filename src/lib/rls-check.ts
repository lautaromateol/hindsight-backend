import { prisma } from './prisma.ts';

// Las políticas de filas no rigen para el dueño de las tablas ni para roles con BYPASSRLS.
// Si la API se conecta así, el aislamiento depende solo de los filtros de cada consulta: se avisa al arrancar.
export async function warnIfRlsBypassed(): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<{ bypass: boolean; owner: boolean }[]>`
      SELECT (r.rolsuper OR r.rolbypassrls) AS bypass,
             EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = 'Workspace' AND c.relowner = r.oid) AS owner
      FROM pg_roles r WHERE r.rolname = current_user`;
    if (rows[0]?.bypass || rows[0]?.owner) {
      console.warn(JSON.stringify({ level: 'warn', event: 'rls_bypassed', message: 'El rol de la base esquiva la seguridad por filas; conectá la API con el rol escolio_app (docs/rls.md).' }));
    }
  } catch (error) {
    console.warn(JSON.stringify({ level: 'warn', event: 'rls_check_failed', message: error instanceof Error ? error.message : String(error) }));
  }
}
