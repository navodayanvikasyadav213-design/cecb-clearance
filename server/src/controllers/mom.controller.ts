import { Response } from "express";
import { prisma } from "../utils/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import { writeAuditEvent } from "../utils/audit";
import { assertTransition } from "../services/statusMachine";
import { generateGist } from "../services/gist.service";
import { createNotification, emitAppStatusUpdate } from "../services/notification.service";

// ── Verify Document (Scrutiny) ────────────────────────────────────────────────
export const verifyDocument = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const docId = String(req.params.docId);
    const { verified } = req.body as { verified: boolean };

    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc) throw new AppError("Document not found", 404);

    const updated = await prisma.document.update({
      where: { id: docId },
      data: { verified, verifiedBy: req.user!.userId },
    });

    await writeAuditEvent({
      eventType: "DOCUMENT_VERIFIED",
      actorId: req.user!.userId,
      applicationId: doc.applicationId,
      payload: { documentId: docId, verified },
    });

    res.json({ success: true, data: { document: updated } });
  }
);

// ── Finalize MoM (MoM Team) ───────────────────────────────────────────────────
export const finalizeMom = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || "");
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);

    assertTransition(app.status, "FINALIZED");

    const updated = await prisma.application.update({
      where: { id },
      data: { status: "FINALIZED", momLocked: true },
    });

    await writeAuditEvent({
      eventType: "MOM_FINALIZED",
      actorId: req.user!.userId,
      applicationId: id,
      payload: { from: "MOM_GENERATED", to: "FINALIZED" },
    });

    emitAppStatusUpdate(id, "FINALIZED");
    await createNotification(app.proponentId, id, "STATUS_UPDATE", "MoM has been finalized.");

    res.json({ success: true, data: { application: updated } });
  }
);

// ── Update Gist Text (MoM Team edit) ─────────────────────────────────────────
export const updateGist = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const { gistText } = req.body as { gistText: string };
    if (!gistText) throw new AppError("gistText required", 400);

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);
    if (app.momLocked) throw new AppError("MoM is locked and cannot be edited", 400);

    const updated = await prisma.application.update({
      where: { id },
      data: { gistText, momText: gistText },
    });

    res.json({ success: true, data: { application: updated } });
  }
);

// ── Trigger Gist Generation (called after refer) ──────────────────────────────
export const triggerGistGeneration = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const app = await prisma.application.findUnique({
      where: { id },
      include: { documents: true, proponent: true, gisRiskFlags: true },
    });
    if (!app) throw new AppError("Application not found", 404);
    if (app.status !== "REFERRED") throw new AppError("Application must be in REFERRED state", 400);

    // Store userId for use inside async callback
    const actorId = req.user!.userId;
    // Start generation asynchronously and immediately return
    generateGist(app).then(async (gistText: string) => {
      await prisma.application.update({
        where: { id },
        data: { gistText, momText: gistText, status: "MOM_GENERATED" },
      });
      await writeAuditEvent({
        eventType: "STATUS_CHANGED",
        actorId,
        applicationId: id,
        payload: { from: "REFERRED", to: "MOM_GENERATED" },
      });
      emitAppStatusUpdate(id, "MOM_GENERATED");
      await createNotification(app.proponentId, id, "STATUS_UPDATE", "Your MoM gist has been automatically generated.");
    }).catch((err: unknown) => {
      console.error("Gist generation failed:", err instanceof Error ? err.message : err);
    });

    res.json({ success: true, message: "Gist generation started. Check back in a few seconds." });
  }
);
