import z from "zod";

export const joinWorkspaceSchema = z.object({
  code: z.string().trim().min(1, "El código de invitación es obligatorio.").meta({
    description: "Código de invitación. Se ignoran espacios, guiones y mayúsculas/minúsculas.",
    example: "ZP4M-8QDX",
  }),
})

export type JoinWorkspaceInput = z.infer<typeof joinWorkspaceSchema>
