import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";

export async function deleteWorkspace(req: Request, res: Response) {
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
        "No estás autorizado a eliminar el espacio de trabajo.",
      );
    }

    await prisma.$transaction([
      prisma.member.deleteMany({ where: { workspaceId: id as string } }),
      prisma.workspace.delete({ where: { id: id as string } }),
    ]);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Error interno del servidor." });
  }
}
