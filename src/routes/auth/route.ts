import express, { type Express } from "express";
import { getMe, updateMe } from "../../controllers/auth/index.ts";

const app: Express = express();

app.get("/me", getMe)
app.patch("/me", updateMe)

export default app;
