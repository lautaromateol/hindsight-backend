-- Los códigos existentes (8 hex en minúscula) pasan al formato visible "AB12-CD34";
-- siguen siendo válidos porque el alta normaliza espacios, guiones y mayúsculas.
UPDATE "Workspace"
SET "inviteCode" = upper(substr("inviteCode", 1, 4) || '-' || substr("inviteCode", 5, 4))
WHERE "inviteCode" ~ '^[0-9a-f]{8}$';

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_inviteCode_key" ON "Workspace"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Member_workspaceId_userId_key" ON "Member"("workspaceId", "userId");
