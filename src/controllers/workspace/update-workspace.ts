import type { Request, Response } from "express";
import z from "zod";
import { getAuth } from "@clerk/express";
import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { updateWorkspaceSchema } from "../../schemas/workspace/index.ts";

export async function updateWorkspace(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const { userId } = getAuth(req);

    if (!id) {
      throw new HttpError(
        400,
        "El ID del espacio de trabajo no fue proporcionado.",
      );
    }

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const parsed = updateWorkspaceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos invalidos",
        errors: z.flattenError(parsed.error).fieldErrors,
      });
    }

    const { name, imageUrl } = parsed.data;

    const workspace = await prisma.workspace.findUnique({
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

    if (!workspace) {
      throw new HttpError(404, "Espacio de trabajo no encontrado.");
    }

    if (workspace.members[0]?.role !== "OWNER") {
      throw new HttpError(
        403,
        "No estás autorizado a modificar el espacio de trabajo.",
      );
    }

    const updated = await prisma.workspace.update({
      where: {
        id: id as string,
      },
      data: {
        name,
        imageUrl,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Error interno del servidor." });
  }
}
