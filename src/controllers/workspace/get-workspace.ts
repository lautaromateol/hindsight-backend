import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { workspaceIdParamSchema } from "../../schemas/workspace/index.ts";

export async function getWorkspace(req: Request, res: Response) {
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
            userId: true,
            role: true,
          },
        },
        _count: { select: { members: true } },
      },
    });

    if (!workspace) {
      throw new HttpError(404, "Espacio de trabajo no encontrado.");
    }

    if (!workspace.members.length) {
      throw new HttpError(
        403,
        "No estás autorizado a acceder al espacio de trabajo.",
      );
    }

    const { members, _count, inviteCode, ...rest } = workspace;
    const role = members[0].role;

    return res.status(200).json({
      ...rest,
      // El código de invitación solo lo ve el OWNER.
      ...(role === "OWNER" && { inviteCode }),
      role,
      memberCount: _count.members,
      members: members.map(({ userId }) => ({ userId })),
    });
  } catch (error) {
    return sendError(res, error);
  }
}
