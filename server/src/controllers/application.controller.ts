import { Response } from "express";
import { PrismaClient, AppStatus } from "@prisma/client";
import crypto from "crypto";
import { AuthRequest } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { writeAuditEvent } from "../utils/audit";
import { assertTransition } from "../services/statusMachine";
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../routes/applications/application.schema";
import { createNotification, emitAppStatusUpdate } from "../services/notification.service";

const prisma = new PrismaClient();

// ── Upload Document ───────────────────────────────────────────────────────────
export const uploadDocument = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const { docType } = req.body as { docType?: string };
    const file = req.file;

    if (!file) throw new AppError("File is required", 400);
    if (!docType) throw new AppError("docType is required", 400);

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);

    if (app.proponentId !== req.user!.userId) {
      throw new AppError("Forbidden", 403);
    }

    const fileHash = crypto
      .createHash("sha256")
      .update(`${file.filename}:${file.size}`)
      .digest("hex");

    const document = await prisma.document.create({
      data: {
        applicationId: id,
        docType,
        fileName: file.originalname,
        fileUrl: `/uploads/documents/${file.filename}`,
        fileHash,
      },
    });

    await writeAuditEvent({
      eventType: "DOCUMENT_UPLOADED",
      actorId: req.user!.userId,
      applicationId: id,
      payload: {
        documentId: document.id,
        docType,
        fileName: file.originalname,
      },
    });

    // Trigger OCR asynchronously so as not to block the upload
    (async () => {
      try {
        const fs = require("fs");
        const fileBuffer = await fs.promises.readFile(file.path);
        let extractedText = "";

        if (file.mimetype === "application/pdf") {
          const pdfParse = require("pdf-parse");
          const data = await pdfParse(fileBuffer);
          extractedText = data.text;
        } else if (file.mimetype.startsWith("image/")) {
          const Tesseract = require("tesseract.js");
          const { data } = await Tesseract.recognize(fileBuffer, "eng");
          extractedText = data.text;
        }

        if (extractedText.trim()) {
          await prisma.document.update({
            where: { id: document.id },
            data: { ocrText: extractedText.trim() },
          });
          console.log(`OCR successful for document ${document.id}`);
        }
      } catch (e) {
        console.error("OCR Pipeline Error:", e);
      }
    })();

    res.status(201).json({ success: true, data: { document } });
  }
);

// ── Create Draft ──────────────────────────────────────────────────────────────
export const createApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = req.body as CreateApplicationInput;

    const app = await prisma.application.create({
      data: { ...data, proponentId: req.user!.userId },
    });

    await writeAuditEvent({
      eventType:     "APPLICATION_CREATED",
      actorId:       req.user!.userId,
      applicationId: app.id,
      payload:       { projectName: app.projectName, sector: app.sector },
    });

    res.status(201).json({ success: true, data: { application: app } });
  }
);

// ── Get All (role-filtered) ───────────────────────────────────────────────────
export const getApplications = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { role, userId } = req.user!;

    // Proponents only see their own; others see all
    const where = role === "PROPONENT" ? { proponentId: userId } : {};

    const applications = await prisma.application.findMany({
      where,
      include: {
        proponent: { select: { name: true, email: true, organization: true } },
        documents: { select: { id: true, docType: true, verified: true } },
        payments:  { select: { verified: true, amount: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ success: true, data: { applications } });
  }
);

// ── Get One ───────────────────────────────────────────────────────────────────
export const getApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const { role, userId } = req.user!;

    const app = await prisma.application.findUnique({
      where: { id },
      include: {
        proponent:   { select: { name: true, email: true, organization: true } },
        documents:   true,
        payments:    true,
        edsNotices:  true,
        gisRiskFlags: true,
        auditEvents: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { actor: { select: { name: true, role: true } } },
        },
      },
    });

    if (!app) throw new AppError("Application not found", 404);

    // Proponent can only see their own
    if (role === "PROPONENT" && app.proponentId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    res.json({ success: true, data: { application: app } });
  }
);

// ── Update Draft ──────────────────────────────────────────────────────────────
export const updateApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const data   = req.body as UpdateApplicationInput;

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);
    if (app.proponentId !== req.user!.userId)
      throw new AppError("Forbidden", 403);
    if (app.status !== "DRAFT")
      throw new AppError("Can only edit DRAFT applications", 400);

    const updated = await prisma.application.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: { application: updated } });
  }
);

// ── Submit ────────────────────────────────────────────────────────────────────
export const submitApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);
    if (app.proponentId !== req.user!.userId)
      throw new AppError("Forbidden", 403);

    assertTransition(app.status, "SUBMITTED");

    // Must have at least 1 document
    const docCount = await prisma.document.count({
      where: { applicationId: id },
    });
    if (docCount === 0)
      throw new AppError("Upload at least one document before submitting", 400);

    const updated = await prisma.application.update({
      where: { id },
      data:  { status: "SUBMITTED" },
    });

    await writeAuditEvent({
      eventType:     "STATUS_CHANGED",
      actorId:       req.user!.userId,
      applicationId: id,
      payload:       { from: "DRAFT", to: "SUBMITTED" },
    });

    emitAppStatusUpdate(id, "SUBMITTED");
    await createNotification(app.proponentId, id, "STATUS_UPDATE", "Your application has been submitted successfully.");

    res.json({ success: true, data: { application: updated } });
  }
);

// ── Scrutiny: Move to Under Scrutiny ─────────────────────────────────────────
export const startScrutiny = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);

    assertTransition(app.status, "UNDER_SCRUTINY");

    const updated = await prisma.application.update({
      where: { id },
      data:  { status: "UNDER_SCRUTINY" },
    });

    await writeAuditEvent({
      eventType:     "STATUS_CHANGED",
      actorId:       req.user!.userId,
      applicationId: id,
      payload:       { from: "SUBMITTED", to: "UNDER_SCRUTINY" },
    });

    emitAppStatusUpdate(id, "UNDER_SCRUTINY");
    await createNotification(app.proponentId, id, "STATUS_UPDATE", "Your application is now under scrutiny.");

    res.json({ success: true, data: { application: updated } });
  }
);

// ── Scrutiny: Issue EDS ───────────────────────────────────────────────────────
export const issueEds = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const { deficiencies } = req.body;

    if (!deficiencies) throw new AppError("Deficiencies required", 400);

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);

    assertTransition(app.status, "EDS");

    await prisma.$transaction([
      prisma.application.update({ where: { id }, data: { status: "EDS" } }),
      prisma.edsNotice.create({
        data: { applicationId: id, deficiencies, issuedBy: req.user!.userId },
      }),
    ]);

    await writeAuditEvent({
      eventType:     "EDS_ISSUED",
      actorId:       req.user!.userId,
      applicationId: id,
      payload:       { deficiencies },
    });

    emitAppStatusUpdate(id, "EDS");
    await createNotification(app.proponentId, id, "EDS_ISSUED", "Essential details sought for your application.");

    res.json({ success: true, message: "EDS issued" });
  }
);

// ── Scrutiny: Refer to Meeting ────────────────────────────────────────────────
export const referApplication = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);

    const app = await prisma.application.findUnique({ where: { id } });
    if (!app) throw new AppError("Application not found", 404);

    assertTransition(app.status, "REFERRED");

    const updated = await prisma.application.update({
      where: { id },
      data:  { status: "REFERRED" },
    });

    await writeAuditEvent({
      eventType:     "STATUS_CHANGED",
      actorId:       req.user!.userId,
      applicationId: id,
      payload:       { from: "UNDER_SCRUTINY", to: "REFERRED" },
    });

    // Trigger gist generation Bull job here (handled in route right now or you can put it if you want)
    emitAppStatusUpdate(id, "REFERRED");
    await createNotification(app.proponentId, id, "STATUS_UPDATE", "Your application has been referred for MoM generation.");

    res.json({ success: true, data: { application: updated } });
  }
);