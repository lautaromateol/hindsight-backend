import z from "zod";
import { roleSchema } from "./role.ts";

// Forma de las respuestas (solo documentación); refleja el modelo Workspace de Prisma.
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  inviteCode: z.string(),
}).meta({ id: "Workspace" })

// GET /api/workspace/:id incluye solo la membresía del usuario autenticado.
// inviteCode solo se entrega al OWNER.
export const workspaceWithMembershipSchema = workspaceSchema.extend({
  inviteCode: z.string().optional().meta({ description: "Solo presente si el usuario es OWNER." }),
  role: roleSchema,
  memberCount: z.number().int(),
  members: z.array(z.object({ userId: z.string() })),
}).meta({ id: "WorkspaceWithMembership" })

export type Workspace = z.infer<typeof workspaceSchema>
