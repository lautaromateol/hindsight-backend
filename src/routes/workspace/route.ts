import express, { type Express } from "express";
import { listWorkspaces, joinWorkspace, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } from "../../controllers/workspace/index.ts";

const app: Express = express();

app.get("/", listWorkspaces)
app.post("/join", joinWorkspace)
app.get("/:id", getWorkspace)
app.post("/", createWorkspace)
app.put("/:id", updateWorkspace)
app.delete("/:id", deleteWorkspace)

export default app;