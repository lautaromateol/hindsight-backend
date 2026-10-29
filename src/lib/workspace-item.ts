import type { Role } from "../generated/prisma/client.ts";
import type { WorkspaceListItem } from "../schemas/workspace/index.ts";

// Include de Prisma para armar el ítem: solo la membresía del usuario y el conteo de miembros.
export const workspaceItemInclude = (userId: string) => ({
  members: { where: { userId }, select: { role: true } },
  _count: { select: { members: true } },
});

type WorkspaceItemRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  members: { role: Role }[];
  _count: { members: number };
};

// Requiere que el usuario sea miembro (members[0]); quien llama ya filtró por membresía.
export function toWorkspaceListItem(row: WorkspaceItemRow): WorkspaceListItem {
  const membership = row.members[0];

  if (!membership) {
    throw new Error("El usuario no es miembro del espacio de trabajo.");
  }

  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    role: membership.role,
    memberCount: row._count.members,
    // Todavía no existen las decisiones (ERS sprint 2): el contrato ya incluye los campos.
    decisionCount: 0,
    pending: { respond: 0, review: 0 },
  };
}
