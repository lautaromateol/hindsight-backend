import z from "zod";

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  imageUrl: z.url("La URL de la imagen no es válida.").nullable().optional(),
})

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
