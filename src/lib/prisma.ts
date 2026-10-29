import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

// Ejecuta `fn` en una transacción con el usuario fijado para la seguridad por filas (RNF-T-01).
// `inviteCode` solo se pasa al unirse: deja visible únicamente el workspace de ese código.
// Cada intento que pueda fallar con un error de la base va en su propia llamada: en
// PostgreSQL una transacción con error queda abortada.
export function withUser<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { inviteCode?: string } = {},
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.user_id', ${userId}, true), set_config('app.invite_code', ${options.inviteCode ?? ''}, true)`;
    return fn(tx);
  });
}

// 403 o 404 para un workspace que el usuario no ve: la política de lectura lo oculta,
// así que la existencia se consulta aparte.
export async function workspaceExists(tx: Prisma.TransactionClient, id: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ exists: boolean }[]>`SELECT app_workspace_exists(${id}) AS exists`;
  return rows[0]?.exists === true;
}
