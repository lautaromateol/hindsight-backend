import z from "zod";
import { githubUsernameSchema } from "./github-username.ts";

export const updateProfileSchema = z.object({
  githubUsername: githubUsernameSchema.nullable().meta({
    description: "Usuario de GitHub declarado a mano (queda sin verificar). `null` lo quita.",
  }),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
