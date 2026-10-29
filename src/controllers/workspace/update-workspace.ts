import type { Request, Response } from "express";
import z from "zod";
import { getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { withUser, workspaceExists } from "../../lib/prisma.ts";
import { updateWorkspaceSchema, workspaceIdParamSchema } from "../../schemas/workspace/index.ts";

export async function updateWorkspace(req: Request, res: Response) {
  try {
    const parsedParams = workspaceIdParamSchema.safeParse(req.params);

    const { userId } = getAuth(req);

    if (!parsedParams.success) {
      throw new HttpError(
        400,
        "El ID del espacio de trabajo no fue proporcionado.",
      );
    }

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const { id } = parsedParams.data;

    const parsed = updateWorkspaceSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        "Datos invalidos",
        "VALIDATION_ERROR",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const { name, imageUrl } = parsed.data;

    const updated = await withUser(userId, async (tx) => {
      const workspace = await tx.workspace.findUnique({
        where: {
          id: id as string,
        },
        include: {
          members: {
            where: {
              userId,
            },
            select: {
              role: true,
            },
          },
        },
      });

      // La seguridad por filas oculta los workspaces ajenos: se distingue 403 de 404 aparte.
      if (!workspace) {
        if (await workspaceExists(tx, id as string)) {
          throw new HttpError(
            403,
            "No estás autorizado a modificar el espacio de trabajo.",
          );
        }
        throw new HttpError(404, "Espacio de trabajo no encontrado.");
      }

      if (workspace.members[0]?.role !== "OWNER") {
        throw new HttpError(
          403,
          "No estás autorizado a modificar el espacio de trabajo.",
        );
      }

      return tx.workspace.update({
        where: {
          id: id as string,
        },
        data: {
          name,
          imageUrl,
        },
      });
    });

    return res.status(200).json(updated);
  } catch (error) {
    return sendError(res, error);
  }
}
