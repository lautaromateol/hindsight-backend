import type { Request, Response } from "express";
import z from "zod";
import { clerkClient, getAuth } from "@clerk/express";
import { HttpError } from "../../lib/http-error.ts";
import { randomBytes } from "node:crypto";
import { createWorkspaceSchema } from "../../schemas/workspace/index.ts";
import { prisma } from "../../lib/prisma.ts";

export async function createWorkspace(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const parsed = createWorkspaceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos invalidos",
        errors: z.flattenError(parsed.error).fieldErrors,
      });
    }

    const { name } = parsed.data;

    const user = await clerkClient.users.getUser(userId);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        inviteCode: randomBytes(4).toString("hex"),
        members: {
          create: {
            userId,
            name: user.fullName ?? user.username ?? "Usuario",
            imageUrl: user.imageUrl,
            role: "OWNER",
          },
        },
      },
    });

    return res.status(201).json(workspace);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Error interno del servidor." });
  }
}
