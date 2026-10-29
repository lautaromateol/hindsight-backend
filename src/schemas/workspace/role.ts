import z from "zod";

export const roleSchema = z.enum(["OWNER", "MEMBER"]).meta({ id: "WorkspaceRole" })
