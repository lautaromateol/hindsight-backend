import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { createWorkspace, deleteWorkspace, getWorkspace, joinWorkspace, listWorkspaces, updateWorkspace } from "../src/controllers/workspace/index.ts";
import { generateInviteCode, normalizeInviteCode } from "../src/lib/invite-code.ts";
import { joinWorkspaceSchema, workspaceListItemSchema, workspaceWithMembershipSchema } from "../src/schemas/workspace/index.ts";
import { fakeReq, fakeRes, installFakeDb } from "./helpers/fake-env.ts";

const db = installFakeDb();

beforeEach(() => {
  db.workspaces.length = 0;
  db.members.length = 0;
});

describe("código de invitación", () => {
  test("tiene 8 caracteres en dos grupos, sin símbolos ambiguos", () => {
    for (let i = 0; i < 500; i++) {
      assert.match(generateInviteCode(), /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    }
  });

  test("normaliza espacios, guiones y minúsculas", () => {
    assert.equal(normalizeInviteCode(" zp4m 8qdx "), "ZP4M-8QDX");
    assert.equal(normalizeInviteCode("ZP4M-8QDX"), "ZP4M-8QDX");
    assert.equal(normalizeInviteCode("zp-4m8-qdx"), "ZP4M-8QDX");
    assert.equal(normalizeInviteCode("ZP4M"), null);
    assert.equal(normalizeInviteCode("---"), null);
  });

  test("createWorkspace guarda un código con el formato nuevo y el usuario como OWNER", async () => {
    const res = fakeRes();
    await createWorkspace(fakeReq("ana", { body: { name: "Plataforma" } }), res);
    assert.equal(res.statusCode, 201);
    assert.match(res.body.inviteCode, /^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    assert.deepEqual(db.members.map((m) => [m.userId, m.role]), [["ana", "OWNER"]]);
  });
});

describe("GET /api/workspace", () => {
  test("sin sesión responde 401", async () => {
    const res = fakeRes();
    await listWorkspaces(fakeReq(null), res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });

  test("aislamiento: solo lista los workspaces del usuario, sin inviteCode", async () => {
    const mine = db.seedWorkspace("Mío", "AAAA-2222", "ana");
    db.seedMember(mine.id, "beto");
    db.seedWorkspace("Ajeno", "BBBB-3333", "beto");

    const res = fakeRes();
    await listWorkspaces(fakeReq("ana"), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.length, 1);
    assert.deepEqual(res.body[0], {
      id: mine.id,
      name: "Mío",
      imageUrl: null,
      role: "OWNER",
      memberCount: 2,
      decisionCount: 0,
      pending: { respond: 0, review: 0 },
    });
    assert.ok(workspaceListItemSchema.safeParse(res.body[0]).success);
    assert.ok(!JSON.stringify(res.body).includes("inviteCode"));
  });

  test("un usuario sin workspaces recibe una lista vacía", async () => {
    db.seedWorkspace("Ajeno", "BBBB-3333", "beto");
    const res = fakeRes();
    await listWorkspaces(fakeReq("ana"), res);
    assert.deepEqual(res.body, []);
  });

  test("el rol es el del usuario que consulta", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");
    db.seedMember(ws.id, "beto");
    const res = fakeRes();
    await listWorkspaces(fakeReq("beto"), res);
    assert.equal(res.body[0].role, "MEMBER");
  });
});

describe("POST /api/workspace/join", () => {
  test("sin sesión responde 401", async () => {
    const res = fakeRes();
    await joinWorkspace(fakeReq(null, { body: { code: "AAAA-2222" } }), res);
    assert.equal(res.statusCode, 401);
  });

  test("sin código responde 400 VALIDATION_ERROR", async () => {
    for (const body of [{}, { code: "" }, { code: "   " }, { code: 42 }, undefined]) {
      const res = fakeRes();
      await joinWorkspace(fakeReq("ana", { body }), res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
    assert.ok(!joinWorkspaceSchema.safeParse({}).success);
  });

  test("código inexistente o mal formado responde 404 INVALID_INVITE_CODE", async () => {
    db.seedWorkspace("Equipo", "AAAA-2222", "beto");
    for (const code of ["ZZZZ-9999", "AAAA", "AAAA-22222"]) {
      const res = fakeRes();
      await joinWorkspace(fakeReq("ana", { body: { code } }), res);
      assert.equal(res.statusCode, 404);
      assert.equal(res.body.error.code, "INVALID_INVITE_CODE");
    }
    assert.equal(db.members.filter((m) => m.userId === "ana").length, 0);
  });

  test("201 con el ítem del listado, rol MEMBER; normaliza el código", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "beto");
    const res = fakeRes();
    await joinWorkspace(fakeReq("ana", { body: { code: " aaaa 2222 " } }), res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, {
      id: ws.id,
      name: "Equipo",
      imageUrl: null,
      role: "MEMBER",
      memberCount: 2,
      decisionCount: 0,
      pending: { respond: 0, review: 0 },
    });
    assert.ok(!JSON.stringify(res.body).includes("inviteCode"));
    assert.deepEqual(db.members.filter((m) => m.userId === "ana").map((m) => m.role), ["MEMBER"]);
  });

  test("aislamiento: unirse a un workspace no da acceso a otro", async () => {
    db.seedWorkspace("Equipo", "AAAA-2222", "beto");
    const otro = db.seedWorkspace("Otro", "BBBB-3333", "carla");
    await joinWorkspace(fakeReq("ana", { body: { code: "AAAA-2222" } }), fakeRes());

    const res = fakeRes();
    await getWorkspace(fakeReq("ana", { params: { id: otro.id } }), res);
    assert.equal(res.statusCode, 403);
  });

  test("409 ALREADY_MEMBER devuelve el workspace y no duplica la membresía", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");
    const res = fakeRes();
    await joinWorkspace(fakeReq("ana", { body: { code: "aaaa2222" } }), res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error.code, "ALREADY_MEMBER");
    assert.equal(res.body.error.details.workspace.id, ws.id);
    assert.equal(res.body.error.details.workspace.role, "OWNER");
    assert.ok(workspaceListItemSchema.safeParse(res.body.error.details.workspace).success);
    assert.equal(db.members.length, 1);
  });

  test("pedidos simultáneos del mismo usuario: uno entra (201) y el otro recibe 409", async () => {
    db.seedWorkspace("Equipo", "AAAA-2222", "beto");
    const results = [fakeRes(), fakeRes(), fakeRes()];
    await Promise.all(results.map((res) => joinWorkspace(fakeReq("ana", { body: { code: "AAAA-2222" } }), res)));

    assert.deepEqual(results.map((r) => r.statusCode).sort(), [201, 409, 409]);
    assert.equal(db.members.filter((m) => m.userId === "ana").length, 1);
  });
});

describe("GET /api/workspace/:id", () => {
  test("el OWNER ve role, memberCount e inviteCode", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");
    db.seedMember(ws.id, "beto");
    const res = fakeRes();
    await getWorkspace(fakeReq("ana", { params: { id: ws.id } }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.role, "OWNER");
    assert.equal(res.body.memberCount, 2);
    assert.equal(res.body.inviteCode, "AAAA-2222");
    assert.deepEqual(res.body.members, [{ userId: "ana" }]);
    assert.ok(workspaceWithMembershipSchema.safeParse(res.body).success);
  });

  test("un MEMBER ve su rol pero no el inviteCode", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");
    db.seedMember(ws.id, "beto");
    const res = fakeRes();
    await getWorkspace(fakeReq("beto", { params: { id: ws.id } }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.role, "MEMBER");
    assert.ok(!("inviteCode" in res.body));
    assert.ok(workspaceWithMembershipSchema.safeParse(res.body).success);
  });

  test("un no miembro recibe 403 y un id inexistente 404", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");
    const forbidden = fakeRes();
    await getWorkspace(fakeReq("intruso", { params: { id: ws.id } }), forbidden);
    assert.equal(forbidden.statusCode, 403);
    assert.ok(!JSON.stringify(forbidden.body).includes("AAAA-2222"));

    const missing = fakeRes();
    await getWorkspace(fakeReq("ana", { params: { id: "nope" } }), missing);
    assert.equal(missing.statusCode, 404);
  });
});

describe("PUT y DELETE /api/workspace/:id", () => {
  test("aislamiento: un no miembro recibe 403 y el workspace queda intacto", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");

    const put = fakeRes();
    await updateWorkspace(fakeReq("intruso", { params: { id: ws.id }, body: { name: "Mío" } }), put);
    assert.equal(put.statusCode, 403);

    const del = fakeRes();
    await deleteWorkspace(fakeReq("intruso", { params: { id: ws.id } }), del);
    assert.equal(del.statusCode, 403);

    assert.equal(db.workspaces[0].name, "Equipo");
    assert.equal(db.workspaces.length, 1);
  });

  test("un MEMBER no puede modificar ni eliminar; un id inexistente responde 404", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");
    db.seedMember(ws.id, "beto");

    const put = fakeRes();
    await updateWorkspace(fakeReq("beto", { params: { id: ws.id }, body: { name: "Mío" } }), put);
    assert.equal(put.statusCode, 403);

    const del = fakeRes();
    await deleteWorkspace(fakeReq("beto", { params: { id: ws.id } }), del);
    assert.equal(del.statusCode, 403);

    const missing = fakeRes();
    await deleteWorkspace(fakeReq("ana", { params: { id: "nope" } }), missing);
    assert.equal(missing.statusCode, 404);
  });

  test("el OWNER modifica y elimina; al eliminar se van sus membresías", async () => {
    const ws = db.seedWorkspace("Equipo", "AAAA-2222", "ana");
    db.seedMember(ws.id, "beto");

    const put = fakeRes();
    await updateWorkspace(fakeReq("ana", { params: { id: ws.id }, body: { name: "Plataforma" } }), put);
    assert.equal(put.statusCode, 200);
    assert.equal(db.workspaces[0].name, "Plataforma");

    const del = fakeRes();
    await deleteWorkspace(fakeReq("ana", { params: { id: ws.id } }), del);
    assert.equal(del.statusCode, 204);
    assert.equal(db.workspaces.length, 0);
    assert.equal(db.members.length, 0);
  });
});
