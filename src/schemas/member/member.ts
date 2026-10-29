import z from "zod";
import { roleSchema } from "../workspace/index.ts";

// Miembro de un espacio de trabajo con su usuario de GitHub (RF-S1-09).
export const memberSchema = z.object({
  userId: z.string().meta({ description: "Id de usuario de Clerk." }),
  name: z.string(),
  imageUrl: z.string().nullable(),
  role: roleSchema,
  githubUsername: z.string().nullable().meta({ description: "`null` si todavía no registró su usuario de GitHub." }),
  githubVerified: z.boolean().meta({ description: "`true` si Clerk verificó el usuario con una cuenta de GitHub vinculada." }),
}).meta({ id: "Member" })

export type Member = z.infer<typeof memberSchema>
