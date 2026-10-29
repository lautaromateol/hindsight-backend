import z from "zod";

// Reglas de GitHub: 1 a 39 caracteres alfanuméricos o guiones, sin guion al inicio, al final ni doble.
// Se guarda en minúscula porque GitHub no distingue mayúsculas.
export const githubUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/, "El usuario de GitHub no es válido.")
  .meta({ description: "Usuario de GitHub, sin `@`. Se guarda en minúscula.", example: "octocat" })
