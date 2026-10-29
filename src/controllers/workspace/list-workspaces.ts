import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { toWorkspaceListItem, workspaceItemInclude } from "../../lib/workspace-item.ts";

export async function listWorkspaces(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: workspaceItemInclude(userId),
      orderBy: { name: "asc" },
    });

    return res.status(200).json(workspaces.map(toWorkspaceListItem));
  } catch (error) {
    return sendError(res, error);
  }
}
