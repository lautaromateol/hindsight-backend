import type { Request, Response } from "express";
import z from "zod";
import { clerkClient, getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { normalizeInviteCode } from "../../lib/invite-code.ts";
import { prisma } from "../../lib/prisma.ts";
import { toWorkspaceListItem, workspaceItemInclude } from "../../lib/workspace-item.ts";
import { joinWorkspaceSchema } from "../../schemas/workspace/index.ts";

export async function joinWorkspace(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const parsed = joinWorkspaceSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        "Datos invalidos",
        "VALIDATION_ERROR",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const inviteCode = normalizeInviteCode(parsed.data.code);

    const workspace = inviteCode
      ? await prisma.workspace.findUnique({
          where: { inviteCode },
          include: workspaceItemInclude(userId),
        })
      : null;

    if (!workspace) {
      throw new HttpError(404, "El código de invitación no es válido.", "INVALID_INVITE_CODE");
    }

    if (workspace.members.length) {
      throw alreadyMember(toWorkspaceListItem(workspace));
    }

    const user = await clerkClient.users.getUser(userId);

    try {
      await prisma.member.create({
        data: {
          workspaceId: workspace.id,
          userId,
          name: user.fullName ?? user.username ?? "Usuario",
          imageUrl: user.imageUrl,
          role: "MEMBER",
        },
      });
    } catch (error) {
      // Dos pedidos simultáneos: el índice único (workspaceId, userId) deja pasar solo uno.
      if ((error as { code?: string }).code === "P2002") {
        throw alreadyMember(await findItem(workspace.id, userId));
      }
      throw error;
    }

    return res.status(201).json(await findItem(workspace.id, userId));
  } catch (error) {
    return sendError(res, error);
  }
}

async function findItem(workspaceId: string, userId: string) {
  const row = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: workspaceItemInclude(userId),
  });
  return toWorkspaceListItem(row);
}

function alreadyMember(workspace: ReturnType<typeof toWorkspaceListItem>) {
  return new HttpError(409, `Ya sos miembro de ${workspace.name}.`, "ALREADY_MEMBER", { workspace });
}
