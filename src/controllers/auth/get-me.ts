import type { Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { HttpError, sendError } from "../../lib/http-error.ts";
import { syncGithubFromClerk, toProfile } from "../../lib/github-profile.ts";
import { withUser } from "../../lib/prisma.ts";

export async function getMe(req: Request, res: Response) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new HttpError(401, "Usuario no autenticado.");
    }

    const user = await clerkClient.users.getUser(userId);
    const profile = await withUser(userId, (tx) => syncGithubFromClerk(tx, userId, user));

    return res.status(200).json(toProfile(userId, user, profile));
  } catch (error) {
    return sendError(res, error);
  }
}
