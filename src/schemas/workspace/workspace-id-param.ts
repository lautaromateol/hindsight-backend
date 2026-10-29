import z from "zod";

export const workspaceIdParamSchema = z.object({
  id: z.string().min(1).meta({ description: "ID del espacio de trabajo.", example: "0f8fad5b-d9cb-469f-a165-70867728950e" }),
})

export type WorkspaceIdParam = z.infer<typeof workspaceIdParamSchema>
