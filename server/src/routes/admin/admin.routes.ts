import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { listUsers, updateUserRole, getAllApplicationsAdmin, verifyAuditChain } from "../../controllers/admin.controller";

const router = Router();

router.get("/users", requireAuth, requireRole(["ADMIN"]), listUsers);
router.patch("/users/:id/role", requireAuth, requireRole(["ADMIN"]), updateUserRole);
router.get("/applications", requireAuth, requireRole(["ADMIN"]), getAllApplicationsAdmin);
router.get("/audit/verify", requireAuth, requireRole(["ADMIN"]), verifyAuditChain);

export default router;
