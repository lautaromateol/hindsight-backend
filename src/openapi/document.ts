import z from "zod";
import { createDocument } from "zod-openapi";
import { errorSchema, meSchema } from "../schemas/error.ts";
import {
  createWorkspaceSchema,
  joinWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  workspaceListItemSchema,
  workspaceSchema,
  workspaceWithMembershipSchema,
} from "../schemas/workspace/index.ts";

const json = <T extends z.ZodType>(schema: T) => ({ "application/json": { schema } });

const error = (description: string, example: { code: string; message: string }) => ({
  description,
  content: { "application/json": { schema: errorSchema, example: { error: example } } },
});

const unauthorized = error("Sin sesión válida de Clerk.", { code: "UNAUTHORIZED", message: "Usuario no autenticado." });
const serverError = error("Error propio o de Clerk/base de datos.", {
  code: "INTERNAL_ERROR",
  message: "Error interno del servidor.",
});
const validationError = {
  description:
    "Datos inválidos (`VALIDATION_ERROR`, con `details` por campo) o ID ausente. Un JSON mal formado lo rechaza Express antes del controlador, con su respuesta por defecto (no usa este formato).",
  content: {
    "application/json": {
      schema: errorSchema,
      example: { error: { code: "VALIDATION_ERROR", message: "Datos invalidos", details: { name: ["El nombre es obligatorio."] } } },
    },
  },
};

const exampleItem = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  name: "Equipo Plataforma",
  imageUrl: null,
  role: "MEMBER",
  memberCount: 4,
  decisionCount: 0,
  pending: { respond: 0, review: 0 },
};

const security = [{ clerkSession: [] }];

export function buildOpenApiDocument() {
  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "Escolio API",
      version: "0.0.0",
      description:
        "API REST de Escolio. Todo error de los controladores usa `{ error: { code, message } }`. " +
        "Cada controlador comprueba la sesión y responde 401 si falta.",
    },
    servers: [{ url: "http://localhost:3000", description: "Desarrollo" }],
    components: {
      securitySchemes: {
        clerkSession: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Token de sesión de Clerk en `Authorization: Bearer <token>` (la cookie `__session` también lo satisface). " +
            "`clerkMiddleware()` no bloquea por sí solo: el 401 lo emite cada controlador.",
        },
      },
    },
    paths: {
      "/": {
        get: {
          operationId: "hello",
          summary: "Comprobación de vida",
          responses: {
            "200": { description: "Texto plano `Hello World!`.", content: { "text/plain": { schema: z.string() } } },
          },
        },
      },
      "/me": {
        get: {
          operationId: "getMe",
          tags: ["auth"],
          summary: "Usuario autenticado",
          security,
          responses: {
            "200": { description: "Id de usuario de Clerk.", content: json(meSchema) },
            "401": unauthorized,
          },
        },
      },
      "/api/workspace": {
        get: {
          operationId: "listWorkspaces",
          tags: ["workspace"],
          summary: "Listar mis espacios de trabajo",
          description:
            "Solo los espacios donde el usuario es miembro, ordenados por nombre. Nunca incluye `inviteCode`. " +
            "`decisionCount` y `pending` valen 0 hasta que existan las decisiones (ERS sprint 2); el contrato ya los incluye. " +
            "Difiere del ERS (`GET /api/workspaces`): la ruta real es singular.",
          security,
          responses: {
            "200": {
              description: "Lista (vacía si el usuario no es miembro de ninguno).",
              content: { "application/json": { schema: z.array(workspaceListItemSchema), example: [exampleItem] } },
            },
            "401": unauthorized,
            "500": serverError,
          },
        },
        post: {
          operationId: "createWorkspace",
          tags: ["workspace"],
          summary: "Crear un espacio de trabajo",
          description: "El usuario autenticado queda como `OWNER`.",
          security,
          requestBody: { required: true, content: json(createWorkspaceSchema) },
          responses: {
            "201": { description: "Espacio creado.", content: json(workspaceSchema) },
            "400": validationError,
            "401": unauthorized,
            "500": serverError,
          },
        },
      },
      "/api/workspace/join": {
        post: {
          operationId: "joinWorkspace",
          tags: ["workspace"],
          summary: "Unirse a un espacio con código de invitación",
          description:
            "El código se normaliza (sin espacios ni guiones, en mayúsculas) antes de comparar. " +
            "El usuario queda como `MEMBER`. Difiere del ERS (`POST /api/workspaces/join`): la ruta real es singular.",
          security,
          requestBody: { required: true, content: json(joinWorkspaceSchema) },
          responses: {
            "201": {
              description: "Se unió; mismo ítem que el listado, con `role: \"MEMBER\"`.",
              content: { "application/json": { schema: workspaceListItemSchema, example: exampleItem } },
            },
            "400": {
              description: "Falta el código (`VALIDATION_ERROR`, con `details` por campo).",
              content: {
                "application/json": {
                  schema: errorSchema,
                  example: {
                    error: {
                      code: "VALIDATION_ERROR",
                      message: "Datos invalidos",
                      details: { code: ["El código de invitación es obligatorio."] },
                    },
                  },
                },
              },
            },
            "401": unauthorized,
            "404": error("Ningún espacio tiene ese código.", {
              code: "INVALID_INVITE_CODE",
              message: "El código de invitación no es válido.",
            }),
            "409": {
              description:
                "El usuario ya era miembro (`ALREADY_MEMBER`). `details.workspace` trae el mismo ítem del listado, con el rol que ya tenía (puede ser `OWNER`).",
              content: {
                "application/json": {
                  schema: errorSchema,
                  example: {
                    error: {
                      code: "ALREADY_MEMBER",
                      message: "Ya sos miembro de Equipo Plataforma.",
                      details: { workspace: exampleItem },
                    },
                  },
                },
              },
            },
            "500": serverError,
          },
        },
      },
      "/api/workspace/{id}": {
        get: {
          operationId: "getWorkspace",
          tags: ["workspace"],
          summary: "Obtener un espacio de trabajo",
          description:
            "Solo para miembros del espacio. Incluye el `role` del usuario y `memberCount`. " +
            "`inviteCode` solo se devuelve si el usuario es `OWNER`.",
          security,
          requestParams: { path: workspaceIdParamSchema },
          responses: {
            "200": { description: "El espacio, con la membresía del usuario.", content: json(workspaceWithMembershipSchema) },
            "400": validationError,
            "401": unauthorized,
            "403": error("El usuario no es miembro.", { code: "FORBIDDEN", message: "No estás autorizado a acceder al espacio de trabajo." }),
            "404": error("No existe.", { code: "NOT_FOUND", message: "Espacio de trabajo no encontrado." }),
            "500": serverError,
          },
        },
        put: {
          operationId: "updateWorkspace",
          tags: ["workspace"],
          summary: "Modificar un espacio de trabajo",
          description: "Solo el `OWNER`.",
          security,
          requestParams: { path: workspaceIdParamSchema },
          requestBody: { required: true, content: json(updateWorkspaceSchema) },
          responses: {
            "200": { description: "Espacio actualizado.", content: json(workspaceSchema) },
            "400": validationError,
            "401": unauthorized,
            "403": error("El usuario no es `OWNER`.", { code: "FORBIDDEN", message: "No estás autorizado a modificar el espacio de trabajo." }),
            "404": error("No existe.", { code: "NOT_FOUND", message: "Espacio de trabajo no encontrado." }),
            "500": serverError,
          },
        },
        delete: {
          operationId: "deleteWorkspace",
          tags: ["workspace"],
          summary: "Eliminar un espacio de trabajo",
          description: "Solo el `OWNER`. Borra también sus miembros.",
          security,
          requestParams: { path: workspaceIdParamSchema },
          responses: {
            "204": { description: "Eliminado, sin cuerpo." },
            "400": validationError,
            "401": unauthorized,
            "403": error("El usuario no es `OWNER`.", { code: "FORBIDDEN", message: "No estás autorizado a eliminar el espacio de trabajo." }),
            "404": error("No existe.", { code: "NOT_FOUND", message: "Espacio de trabajo no encontrado." }),
            "500": serverError,
          },
        },
      },
    },
  });
}
