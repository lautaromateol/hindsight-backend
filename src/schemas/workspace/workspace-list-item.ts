import z from "zod";
import { roleSchema } from "./role.ts";

// Ítem del listado y respuesta de unirse. Nunca lleva inviteCode.
export const workspaceListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  role: roleSchema,
  memberCount: z.number().int(),
  decisionCount: z.number().int().meta({ description: "Siempre 0 hasta que existan las decisiones." }),
  pending: z.object({
    respond: z.number().int().meta({ description: "Decisiones que esperan respuesta del usuario. Siempre 0 por ahora." }),
    review: z.number().int().meta({ description: "Decisiones para revisar. Siempre 0 por ahora." }),
  }),
}).meta({ id: "WorkspaceListItem" })

export type WorkspaceListItem = z.infer<typeof workspaceListItemSchema>
