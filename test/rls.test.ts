import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { prisma, withUser } from "../src/lib/prisma.ts";

// Prueba las políticas reales de PostgreSQL (migración row_level_security). Corre solo con
// RLS_TEST_DATABASE_URL, que debe apuntar a una base de pruebas con las migraciones aplicadas
// y conectar con el rol de la API (escolio_app, ver docs/rls.md). Escribe y borra filas.
const url = process.env.RLS_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("seguridad por filas en PostgreSQL", () => {
  const created: string[] = [];

  async function newWorkspace(userId: string, inviteCode: string) {
    const ws = await withUser(userId, (tx) =>
      tx.workspace.create({
        data: { name: "RLS", inviteCode, members: { create: { userId, name: userId, role: "OWNER" } } },
      }),
    );
    created.push(ws.id);
    return ws;
  }

  after(async () => {
    for (const id of created) {
      await withUser("rls-ana", (tx) => tx.workspace.delete({ where: { id } })).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test("el rol de la API no esquiva las políticas", async () => {
    const rows = await prisma.$queryRaw<{ bypass: boolean }[]>`SELECT (rolsuper OR rolbypassrls) AS bypass FROM pg_roles WHERE rolname = current_user`;
    assert.equal(rows[0].bypass, false);
  });

  test("un usuario solo ve sus workspaces y miembros", async () => {
    const mine = await newWorkspace("rls-ana", "RLS1-AAAA");
    const other = await newWorkspace("rls-beto", "RLS1-BBBB");

    const seen = await withUser("rls-ana", (tx) => tx.workspace.findMany({ where: { id: { in: [mine.id, other.id] } } }));
    assert.deepEqual(seen.map((w) => w.id), [mine.id]);

    const members = await withUser("rls-ana", (tx) => tx.member.findMany({ where: { workspaceId: other.id } }));
    assert.equal(members.length, 0);
  });

  test("un no miembro no puede modificar, borrar ni insertarse como miembro", async () => {
    const ws = await newWorkspace("rls-ana", "RLS2-AAAA");

    const updated = await withUser("rls-intruso", (tx) => tx.$executeRaw`UPDATE "Workspace" SET name = 'x' WHERE id = ${ws.id}`);
    assert.equal(updated, 0);
    const deleted = await withUser("rls-intruso", (tx) => tx.$executeRaw`DELETE FROM "Workspace" WHERE id = ${ws.id}`);
    assert.equal(deleted, 0);

    // Sin código de invitación no hay forma de entrar.
    await assert.rejects(
      withUser("rls-intruso", (tx) => tx.member.create({ data: { workspaceId: ws.id, userId: "rls-intruso", name: "x", role: "MEMBER" } })),
    );
    // Con el código solo se entra como MEMBER, nunca como OWNER.
    await assert.rejects(
      withUser("rls-intruso", (tx) => tx.member.create({ data: { workspaceId: ws.id, userId: "rls-intruso", name: "x", role: "OWNER" } }), { inviteCode: "RLS2-AAAA" }),
    );
  });

  test("con el código de invitación se ve ese workspace y se entra como MEMBER", async () => {
    const ws = await newWorkspace("rls-ana", "RLS3-AAAA");

    const hidden = await withUser("rls-carla", (tx) => tx.workspace.findUnique({ where: { inviteCode: "RLS3-AAAA" } }));
    assert.equal(hidden, null);

    const found = await withUser("rls-carla", (tx) => tx.workspace.findUnique({ where: { inviteCode: "RLS3-AAAA" } }), { inviteCode: "RLS3-AAAA" });
    assert.equal(found?.id, ws.id);

    await withUser("rls-carla", (tx) => tx.member.create({ data: { workspaceId: ws.id, userId: "rls-carla", name: "Carla", role: "MEMBER" } }), { inviteCode: "RLS3-AAAA" });
    const afterJoin = await withUser("rls-carla", (tx) => tx.workspace.findUnique({ where: { id: ws.id } }));
    assert.equal(afterJoin?.id, ws.id);
  });

  test("un MEMBER no modifica ni elimina; el OWNER sí, y se van las membresías", async () => {
    const ws = await newWorkspace("rls-ana", "RLS4-AAAA");
    await withUser("rls-beto", (tx) => tx.member.create({ data: { workspaceId: ws.id, userId: "rls-beto", name: "Beto", role: "MEMBER" } }), { inviteCode: "RLS4-AAAA" });

    assert.equal(await withUser("rls-beto", (tx) => tx.$executeRaw`UPDATE "Workspace" SET name = 'x' WHERE id = ${ws.id}`), 0);
    assert.equal(await withUser("rls-beto", (tx) => tx.$executeRaw`DELETE FROM "Workspace" WHERE id = ${ws.id}`), 0);

    await withUser("rls-ana", (tx) => tx.workspace.delete({ where: { id: ws.id } }));
    const left = await prisma.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "Member" WHERE "workspaceId" = ${ws.id}`;
    assert.equal(Number(left[0].n), 0);
  });
});
