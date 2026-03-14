import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { initiatePayment, getPayment, verifyPayment } from "../../controllers/payment.controller";

const router = Router();

router.post("/initiate", requireAuth, requireRole(["PROPONENT"]), initiatePayment);
router.get("/:applicationId", requireAuth, getPayment);
router.post("/:applicationId/verify", requireAuth, requireRole(["SCRUTINY", "ADMIN"]), verifyPayment);

export default router;
