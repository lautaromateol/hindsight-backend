import type { clerkClient } from "@clerk/express";
import type { Prisma } from "../generated/prisma/client.ts";
import type { Profile } from "../schemas/auth/index.ts";
import { HttpError } from "./http-error.ts";

type ClerkUser = Awaited<ReturnType<typeof clerkClient.users.getUser>>;

const GITHUB_PROVIDERS = new Set(["github", "oauth_github"]);

export const isUniqueViolation = (error: unknown) => (error as { code?: string }).code === "P2002";

export function githubTaken() {
  return new HttpError(409, "Ese usuario de GitHub ya está registrado en otra cuenta.", "GITHUB_USERNAME_TAKEN");
}

// Usuario de GitHub de la cuenta vinculada y verificada en Clerk, si la hay. Sirve para quien entró con
// GitHub y para quien entró con Google o correo y vinculó GitHub después (RF-S1-10).
export function verifiedGithubUsername(user: ClerkUser): string | null {
  const account = user.externalAccounts.find(
    (a) => GITHUB_PROVIDERS.has(a.provider) && a.verification?.status === "verified" && a.username,
  );
  return account?.username?.toLowerCase() ?? null;
}

// Alinea el perfil con lo que Clerk sabe hoy de GitHub:
// - cuenta verificada: queda ese usuario como verificado y desplaza a quien lo declaró a mano sin verificar;
// - sin cuenta y el perfil estaba verificado (la desvinculó): pasa a declarado, conservando el usuario.
export async function syncGithubFromClerk(tx: Prisma.TransactionClient, userId: string, user: ClerkUser) {
  const verified = verifiedGithubUsername(user);
  const current = await tx.profile.findUnique({ where: { userId } });

  if (verified) {
    if (current?.githubVerified && current.githubUsername === verified) return current;

    await tx.$queryRaw`SELECT app_release_github_username(${verified})`;
    try {
      return await tx.profile.upsert({
        where: { userId },
        create: { userId, githubUsername: verified, githubVerified: true },
        update: { githubUsername: verified, githubVerified: true },
      });
    } catch (error) {
      // Lo tiene otra cuenta ya verificada: no se pisa.
      if (isUniqueViolation(error)) throw githubTaken();
      throw error;
    }
  }

  if (current?.githubVerified) {
    return tx.profile.update({ where: { userId }, data: { githubVerified: false } });
  }

  return current;
}

export function toProfile(
  userId: string,
  user: ClerkUser,
  profile: { githubUsername: string | null; githubVerified: boolean } | null,
): Profile {
  const githubUsername = profile?.githubUsername ?? null;
  const githubVerified = githubUsername !== null && profile?.githubVerified === true;

  return {
    userId,
    name: user.fullName ?? user.username ?? "Usuario",
    imageUrl: user.imageUrl ?? null,
    githubUsername,
    githubVerified,
    githubSource: githubVerified ? "clerk" : githubUsername ? "declared" : null,
  };
}
