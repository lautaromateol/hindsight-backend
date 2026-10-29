import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { prisma } from "../../src/lib/prisma.ts";

// Sin clave, clerkClient crea un cliente nuevo en cada acceso y el stub de getUser se perdería.
process.env.CLERK_SECRET_KEY ||= "sk_test_dummy";

type Role = "OWNER" | "MEMBER";
type WorkspaceRow = { id: string; name: string; imageUrl: string | null; inviteCode: string };
type MemberRow = { id: string; userId: string; name: string; imageUrl: string | null; role: Role; workspaceId: string };

// Contexto de la transacción en curso: imita app.user_id y app.invite_code de withUser().
type RlsContext = { userId: string; inviteCode: string };
const rlsContext = new AsyncLocalStorage<RlsContext>();

const rlsViolation = () => Object.assign(new Error("new row violates row-level security policy"), { code: "42501" });

// Base en memoria que reemplaza a Prisma y a Clerk: los tests no tocan red ni base real.
// Solo implementa las consultas que usan los controladores de workspace. Imita las políticas
// de seguridad por filas de la migración row_level_security: fuera de withUser() no se lee ni escribe.
export function installFakeDb() {
  const workspaces: WorkspaceRow[] = [];
  const members: MemberRow[] = [];
  let seq = 0;

  const ctx = () => {
    const current = rlsContext.getStore();
    if (!current) throw new Error("consulta fuera de withUser(): la seguridad por filas no tiene usuario");
    return current;
  };
  const roleOf = (workspaceId: string, userId: string) => members.find((m) => m.workspaceId === workspaceId && m.userId === userId)?.role;
  const visible = (w: WorkspaceRow) => {
    const { userId, inviteCode } = ctx();
    return roleOf(w.id, userId) !== undefined || (inviteCode !== "" && w.inviteCode === inviteCode) || !members.some((m) => m.workspaceId === w.id);
  };
  const memberVisible = (m: MemberRow) => m.userId === ctx().userId || roleOf(m.workspaceId, ctx().userId) !== undefined;

  const withIncludes = (row: WorkspaceRow, include?: any) => {
    const mine = members.filter((m) => m.workspaceId === row.id && memberVisible(m));
    const out: any = { ...row };
    if (include?.members) {
      const where = include.members.where ?? {};
      out.members = mine
        .filter((m) => where.userId === undefined || m.userId === where.userId)
        .map((m) => ({ userId: m.userId, role: m.role }));
    }
    if (include?._count) out._count = { members: mine.length };
    return out;
  };

  const find = (where: any) =>
    workspaces.find((w) => visible(w) && (where.id === undefined || w.id === where.id) && (where.inviteCode === undefined || w.inviteCode === where.inviteCode));

  const workspaceDelegate = {
    findMany: async ({ where, include }: any) => {
      const userId = where?.members?.some?.userId;
      return workspaces
        .filter(visible)
        .filter((w) => userId === undefined || members.some((m) => m.workspaceId === w.id && m.userId === userId))
        .map((w) => withIncludes(w, include));
    },
    findUnique: async ({ where, include }: any) => {
      const row = find(where);
      return row ? withIncludes(row, include) : null;
    },
    findUniqueOrThrow: async (args: any) => {
      const row = await workspaceDelegate.findUnique(args);
      if (!row) throw new Error("No Workspace found");
      return row;
    },
    create: async ({ data }: any) => {
      if (workspaces.some((w) => w.inviteCode === data.inviteCode)) throw Object.assign(new Error("unique"), { code: "P2002" });
      const row = { id: `w${++seq}`, name: data.name, imageUrl: null, inviteCode: data.inviteCode };
      workspaces.push(row);
      if (data.members?.create) {
        const owner = data.members.create;
        if (owner.userId !== ctx().userId || owner.role !== "OWNER") throw rlsViolation();
        members.push({ id: `m${++seq}`, imageUrl: null, ...owner, workspaceId: row.id });
      }
      return row;
    },
    update: async ({ where, data }: any) => {
      const row = workspaces.find((w) => w.id === where.id);
      if (!row || roleOf(row.id, ctx().userId) !== "OWNER") throw Object.assign(new Error("Record not found"), { code: "P2025" });
      Object.assign(row, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      return row;
    },
    delete: async ({ where }: any) => {
      const row = workspaces.find((w) => w.id === where.id);
      if (!row || roleOf(row.id, ctx().userId) !== "OWNER") throw Object.assign(new Error("Record not found"), { code: "P2025" });
      workspaces.splice(workspaces.indexOf(row), 1);
      for (let i = members.length - 1; i >= 0; i--) if (members[i].workspaceId === row.id) members.splice(i, 1);
      return row;
    },
  };

  const memberDelegate = {
    create: async ({ data }: any) => {
      // Simula @@unique([workspaceId, userId]).
      await Promise.resolve();
      const { userId, inviteCode } = ctx();
      const target = workspaces.find((w) => w.id === data.workspaceId);
      if (data.userId !== userId || data.role !== "MEMBER" || !target || inviteCode === "" || target.inviteCode !== inviteCode) throw rlsViolation();
      if (members.some((m) => m.workspaceId === data.workspaceId && m.userId === data.userId)) {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
      members.push({ id: `m${++seq}`, imageUrl: null, ...data });
    },
  };

  Object.defineProperty(prisma, "workspace", { value: workspaceDelegate, configurable: true });
  Object.defineProperty(prisma, "member", { value: memberDelegate, configurable: true });
  // withUser(): la transacción es el propio cliente falso, con el contexto de filas en AsyncLocalStorage.
  Object.defineProperty(prisma, "$transaction", {
    value: (fn: (tx: unknown) => Promise<unknown>) => rlsContext.run({ userId: "", inviteCode: "" }, () => fn(prisma)),
    configurable: true,
  });
  Object.defineProperty(prisma, "$queryRaw", {
    value: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("?");
      if (sql.includes("set_config")) {
        const store = ctx();
        store.userId = String(values[0]);
        store.inviteCode = String(values[1] ?? "");
        return [];
      }
      if (sql.includes("app_workspace_exists")) return [{ exists: workspaces.some((w) => w.id === values[0]) }];
      throw new Error(`consulta cruda no soportada por la base falsa: ${sql}`);
    },
    configurable: true,
  });
  (clerkClient.users as any).getUser = async (userId: string) => ({ fullName: `Usuario ${userId}`, username: null, imageUrl: null });

  return {
    workspaces,
    members,
    seedWorkspace(name: string, inviteCode: string, owner: string): WorkspaceRow {
      const row = { id: `w${++seq}`, name, imageUrl: null, inviteCode };
      workspaces.push(row);
      this.seedMember(row.id, owner, "OWNER");
      return row;
    },
    seedMember(workspaceId: string, userId: string, role: Role = "MEMBER") {
      members.push({ id: `m${++seq}`, userId, name: userId, imageUrl: null, role, workspaceId });
    },
  };
}

const clerkAuthBrand = Symbol.for("@clerk/express.auth");

// Request con sesión de Clerk simulada (userId null = sin sesión).
export function fakeReq(userId: string | null, extra: { body?: unknown; params?: Record<string, string> } = {}) {
  const auth = Object.assign(() => ({ tokenType: "session_token", userId, isAuthenticated: userId !== null }), { [clerkAuthBrand]: true });
  return { auth, body: extra.body, params: extra.params ?? {} } as unknown as Request;
}

export function fakeRes() {
  const res = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send() {
      return this;
    },
  };
  return res as typeof res & Response;
}
