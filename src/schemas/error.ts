import z from "zod";

// Formato uniforme de error (RNF-S1-02); lo produce sendError en src/lib/http-error.ts.
export const errorSchema = z.object({
  error: z.object({
    code: z.string().meta({ example: "NOT_FOUND" }),
    message: z.string(),
    details: z.unknown().optional().meta({ description: "Solo en VALIDATION_ERROR: errores por campo." }),
  }),
}).meta({ id: "Error" })

export const meSchema = z.object({
  userId: z.string(),
}).meta({ id: "Me" })
