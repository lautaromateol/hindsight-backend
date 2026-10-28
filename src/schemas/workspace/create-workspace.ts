import z from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100)
})

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>