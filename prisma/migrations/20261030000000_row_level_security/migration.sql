-- Seguridad por filas (RNF-T-01). La API fija el usuario en cada transacción con
-- set_config('app.user_id', ..., true); las políticas hacen el resto.
-- Las políticas no rigen para el dueño de las tablas ni para roles con BYPASSRLS:
-- la API debe conectarse con un rol sin esos privilegios (ver docs/rls.md).

-- Borrar un workspace borra sus miembros. Las acciones referenciales no pasan por RLS,
-- así que no hace falta una política que deje borrar membresías ajenas.
ALTER TABLE "Member" DROP CONSTRAINT "Member_workspaceId_fkey";
ALTER TABLE "Member" ADD CONSTRAINT "Member_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION app_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;

-- Las funciones que leen Member o Workspace son SECURITY DEFINER para que las políticas
-- no se llamen a sí mismas (recursión infinita). Corren como dueño de las tablas.
CREATE FUNCTION app_member_role(ws text) RETURNS "Role"
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
  AS $$ SELECT "role" FROM "Member" WHERE "workspaceId" = ws AND "userId" = app_user_id() $$;

CREATE FUNCTION app_is_member(ws text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
  AS $$ SELECT EXISTS (SELECT 1 FROM "Member" WHERE "workspaceId" = ws AND "userId" = app_user_id()) $$;

CREATE FUNCTION app_workspace_is_empty(ws text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
  AS $$ SELECT NOT EXISTS (SELECT 1 FROM "Member" WHERE "workspaceId" = ws) $$;

-- Distingue 403 de 404 sin abrir la lectura del workspace.
CREATE FUNCTION app_workspace_exists(ws text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
  AS $$ SELECT EXISTS (SELECT 1 FROM "Workspace" WHERE "id" = ws) $$;

-- Unirse con código: la API fija app.invite_code y solo ese workspace queda visible.
CREATE FUNCTION app_invite_matches(ws text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
  AS $$ SELECT EXISTS (
    SELECT 1 FROM "Workspace"
    WHERE "id" = ws AND "inviteCode" = NULLIF(current_setting('app.invite_code', true), '')
  ) $$;

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;

-- Un workspace sin miembros solo existe dentro de la transacción que lo crea (el primer
-- miembro se inserta en ella), por eso ahí puede leerse su fila RETURNING.
CREATE POLICY workspace_select ON "Workspace" FOR SELECT
  USING (app_is_member("id") OR app_invite_matches("id") OR app_workspace_is_empty("id"));
CREATE POLICY workspace_insert ON "Workspace" FOR INSERT
  WITH CHECK (app_user_id() IS NOT NULL);
CREATE POLICY workspace_update ON "Workspace" FOR UPDATE
  USING (app_member_role("id") = 'OWNER') WITH CHECK (app_member_role("id") = 'OWNER');
CREATE POLICY workspace_delete ON "Workspace" FOR DELETE
  USING (app_member_role("id") = 'OWNER');

CREATE POLICY member_select ON "Member" FOR SELECT
  USING ("userId" = app_user_id() OR app_is_member("workspaceId"));
-- Solo se puede insertar la propia membresía: como OWNER en un workspace recién creado
-- o como MEMBER en el workspace cuyo código de invitación se presentó.
CREATE POLICY member_insert ON "Member" FOR INSERT
  WITH CHECK (
    "userId" = app_user_id() AND (
      ("role" = 'OWNER' AND app_workspace_is_empty("workspaceId"))
      OR ("role" = 'MEMBER' AND app_invite_matches("workspaceId"))
    )
  );
-- Sin política de UPDATE ni DELETE en Member: ninguna ruta los necesita y quedan denegados.

-- Permisos para el rol de la API, si ya existe (ver docs/rls.md).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'escolio_app') THEN
    GRANT USAGE ON SCHEMA public TO escolio_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO escolio_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO escolio_app;
  END IF;
END
$$;
