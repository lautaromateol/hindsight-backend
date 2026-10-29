import type { Request, Response } from "express";
import z from "zod";
import { clerkClient, getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { githubTaken, isUniqueViolation, syncGithubFromClerk, toProfile } from "../../lib/github-profile.ts";
import { withUser } from "../../lib/prisma.ts";
import { updateProfileSchema } from "../../schemas/auth/index.ts";

export async function updateMe(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        "Datos invalidos",
        "VALIDATION_ERROR",
        z.flattenError(parsed.error).fieldErrors,
      );
    }

    const { githubUsername } = parsed.data;
    const user = await clerkClient.users.getUser(userId);

    try {
      const profile = await withUser(userId, async (tx) => {
        // Antes de declarar nada se alinea con Clerk: un usuario verificado no se pisa a mano.
        const current = await syncGithubFromClerk(tx, userId, user);

        if (current?.githubVerified) {
          throw new HttpError(
            409,
            "Tu usuario de GitHub está verificado con la cuenta vinculada; para cambiarlo, cambiá la cuenta vinculada.",
            "GITHUB_VERIFIED",
          );
        }

        return tx.profile.upsert({
          where: { userId },
          create: { userId, githubUsername, githubVerified: false },
          update: { githubUsername, githubVerified: false },
        });
      });

      return res.status(200).json(toProfile(userId, user, profile));
    } catch (error) {
      // El índice único deja pasar a una sola cuenta por usuario de GitHub.
      if (isUniqueViolation(error)) throw githubTaken();
      throw error;
    }
  } catch (error) {
    return sendError(res, error);
  }
}
