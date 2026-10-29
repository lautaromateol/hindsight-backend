-- Perfil con usuario de GitHub (RF-S1-07, RF-S1-10). El usuario se guarda en minúscula.
CREATE TABLE "Profile" (
    "userId" TEXT NOT NULL,
    "githubUsername" TEXT,
    "githubVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "Profile_githubUsername_key" ON "Profile"("githubUsername");

-- Seguridad por filas (RNF-T-01, ver docs/rls.md): cada usuario ve y escribe su propio perfil
-- y ve el de quienes comparten un workspace con él (lista de miembros). Sin política de DELETE.
CREATE FUNCTION app_shares_workspace(uid text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
  AS $$ SELECT EXISTS (
    SELECT 1 FROM "Member" a JOIN "Member" b ON a."workspaceId" = b."workspaceId"
    WHERE a."userId" = app_user_id() AND b."userId" = uid
  ) $$;

-- Una cuenta con GitHub verificado por Clerk desplaza a quien declaró a mano ese mismo usuario.
-- Solo toca perfiles sin verificar de otras personas; por eso es SECURITY DEFINER.
CREATE FUNCTION app_release_github_username(username text) RETURNS void
  LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
  AS $$ UPDATE "Profile" SET "githubUsername" = NULL
        WHERE "githubUsername" = username AND NOT "githubVerified" AND "userId" <> app_user_id() $$;

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_select ON "Profile" FOR SELECT
  USING ("userId" = app_user_id() OR app_shares_workspace("userId"));
CREATE POLICY profile_insert ON "Profile" FOR INSERT
  WITH CHECK ("userId" = app_user_id());
CREATE POLICY profile_update ON "Profile" FOR UPDATE
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());

-- La tabla es nueva: si el rol de la API existe, necesita sus permisos (ya hay un
-- ALTER DEFAULT PRIVILEGES de la migración anterior, pero solo vale para quien lo ejecutó).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'escolio_app') THEN
    GRANT SELECT, INSERT, UPDATE ON "Profile" TO escolio_app;
  END IF;
END
$$;
