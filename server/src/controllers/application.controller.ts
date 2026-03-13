import { Response } from "express";
import { PrismaClient, AppStatus } from "@prisma/client";
import crypto from "crypto";
import { AuthRequest } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { writeAuditEvent } from "../utils/audit";
import { assertTransition } from "../services/statusMachine";
import {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../routes/applications/application.schema";

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

    // TODO Day 8: trigger gist generation Bull job here

    res.json({ success: true, data: { application: updated } });
  }
);