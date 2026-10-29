import type { Request, Response } from "express";
import z from "zod";
import { clerkClient, getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { generateInviteCode } from "../../lib/invite-code.ts";
import { createWorkspaceSchema } from "../../schemas/workspace/index.ts";
import { withUser } from "../../lib/prisma.ts";

export async function createWorkspace(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const parsed = createWorkspaceSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        "Datos invalidos",
        "VALIDATION_ERROR",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const { name } = parsed.data;

    const user = await clerkClient.users.getUser(userId);

    const data = {
      name,
      members: {
        create: {
          userId,
          name: user.fullName ?? user.username ?? "Usuario",
          imageUrl: user.imageUrl,
          role: "OWNER" as const,
        },
      },
    };

    // El código es único en la base; ante la (improbable) colisión se genera otro, en una transacción nueva.
    for (let attempt = 1; ; attempt++) {
      try {
        const workspace = await withUser(userId, (tx) =>
          tx.workspace.create({ data: { ...data, inviteCode: generateInviteCode() } }),
        );
        return res.status(201).json(workspace);
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002" || attempt >= 5) throw error;
      }
    }
  } catch (error) {
    return sendError(res, error);
  }
}
