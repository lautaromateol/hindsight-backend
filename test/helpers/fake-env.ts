import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { prisma } from "../../src/lib/prisma.ts";

// Sin clave, clerkClient crea un cliente nuevo en cada acceso y el stub de getUser se perdería.
process.env.CLERK_SECRET_KEY ||= "sk_test_dummy";

type Role = "OWNER" | "MEMBER";
type WorkspaceRow = { id: string; name: string; imageUrl: string | null; inviteCode: string };
type MemberRow = { id: string; userId: string; name: string; imageUrl: string | null; role: Role; workspaceId: string };

// Base en memoria que reemplaza a Prisma y a Clerk: los tests no tocan red ni base real.
// Solo implementa las consultas que usan los controladores de workspace.
export function installFakeDb() {
  const workspaces: WorkspaceRow[] = [];
  const members: MemberRow[] = [];
  let seq = 0;

  const withIncludes = (row: WorkspaceRow, include?: any) => {
    const mine = members.filter((m) => m.workspaceId === row.id);
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
    workspaces.find((w) => (where.id === undefined || w.id === where.id) && (where.inviteCode === undefined || w.inviteCode === where.inviteCode));

  const workspaceDelegate = {
    findMany: async ({ where, include }: any) => {
      const userId = where?.members?.some?.userId;
      return workspaces
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
      if (data.members?.create) members.push({ id: `m${++seq}`, imageUrl: null, ...data.members.create, workspaceId: row.id });
      return row;
    },
  };

  const memberDelegate = {
    create: async ({ data }: any) => {
      // Simula @@unique([workspaceId, userId]).
      await Promise.resolve();
      if (members.some((m) => m.workspaceId === data.workspaceId && m.userId === data.userId)) {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
      members.push({ id: `m${++seq}`, imageUrl: null, ...data });
    },
  };

  Object.defineProperty(prisma, "workspace", { value: workspaceDelegate, configurable: true });
  Object.defineProperty(prisma, "member", { value: memberDelegate, configurable: true });
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
