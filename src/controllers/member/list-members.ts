import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { withUser, workspaceExists } from "../../lib/prisma.ts";
import { memberWorkspaceParamSchema, type Member } from "../../schemas/member/index.ts";

export async function listMembers(req: Request, res: Response) {
  try {
    const parsedParams = memberWorkspaceParamSchema.safeParse(req.params);

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

    const { workspaceId } = parsedParams.data;

    const members = await withUser(userId, async (tx) => {
      // La seguridad por filas solo deja ver los miembros de los espacios propios.
      const rows = await tx.member.findMany({
        where: { workspaceId },
        orderBy: [{ role: "desc" }, { name: "asc" }],
      });

      if (!rows.length) {
        if (await workspaceExists(tx, workspaceId)) {
          throw new HttpError(
            403,
            "No estás autorizado a acceder al espacio de trabajo.",
          );
        }
        throw new HttpError(404, "Espacio de trabajo no encontrado.");
      }

      const profiles = await tx.profile.findMany({
        where: { userId: { in: rows.map((m) => m.userId) } },
      });
      const byUser = new Map(profiles.map((p) => [p.userId, p]));

      return rows.map((m): Member => {
        const profile = byUser.get(m.userId);
        const githubUsername = profile?.githubUsername ?? null;
        return {
          userId: m.userId,
          name: m.name,
          imageUrl: m.imageUrl,
          role: m.role,
          githubUsername,
          githubVerified: githubUsername !== null && profile?.githubVerified === true,
        };
      });
    });

    return res.status(200).json(members);
  } catch (error) {
    return sendError(res, error);
  }
}
