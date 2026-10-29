import { Router } from "express";
import { listMembers } from "../../controllers/member/index.ts";

// Se monta en /api/workspace/:workspaceId/member; mergeParams deja leer :workspaceId.
const router: Router = Router({ mergeParams: true });

router.get("/", listMembers)

export default router;
