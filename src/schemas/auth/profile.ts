import z from "zod";

export const githubSourceSchema = z.enum(["clerk", "declared"]).meta({ id: "GithubSource" })

// Perfil del usuario autenticado. Nombre e imagen vienen de Clerk; GitHub, de la tabla Profile.
export const profileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  githubUsername: z.string().nullable(),
  githubVerified: z.boolean().meta({
    description: "`true` si Clerk verificó el usuario con una cuenta de GitHub vinculada (entró con GitHub o la vinculó después).",
  }),
  githubSource: githubSourceSchema.nullable().meta({
    description: "`clerk` si está verificado, `declared` si lo escribió a mano, `null` si no tiene. Con `declared` o `null` el cliente puede ofrecer vincular GitHub.",
  }),
}).meta({ id: "Profile" })

export type Profile = z.infer<typeof profileSchema>
