import { Response } from "express";
import { prisma } from "../utils/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import { writeAuditEvent } from "../utils/audit";

// ── List All Users (Admin) ────────────────────────────────────────────────────
export const listUsers = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        organization: true, phone: true, createdAt: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: { users } });
  }
);

// ── Update User Role (Admin) ──────────────────────────────────────────────────
export const updateUserRole = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const { role } = req.body as { role: string };

    const validRoles = ["ADMIN", "PROPONENT", "SCRUTINY", "MOM_TEAM"] as const;
    if (!validRoles.includes(role as (typeof validRoles)[number])) {
      throw new AppError("Invalid role", 400);
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);
    if (id === req.user!.userId) throw new AppError("Cannot change your own role", 400);

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as "ADMIN" | "PROPONENT" | "SCRUTINY" | "MOM_TEAM" },
      select: { id: true, email: true, name: true, role: true },
    });

    await writeAuditEvent({
      eventType: "ROLE_CHANGED",
      actorId: req.user!.userId,
      payload: { targetUserId: id, from: user.role, to: role },
    });

    res.json({ success: true, data: { user: updated } });
  }
);

// ── Get All Applications with stats (Admin) ───────────────────────────────────
export const getAllApplicationsAdmin = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const applications = await prisma.application.findMany({
      include: {
        proponent: { select: { name: true, email: true, organization: true } },
        documents: { select: { id: true, verified: true } },
        payments: { select: { verified: true, amount: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const stats = {
      total: applications.length,
      draft: applications.filter((a) => a.status === "DRAFT").length,
      submitted: applications.filter((a) => a.status === "SUBMITTED").length,
      underScrutiny: applications.filter((a) => a.status === "UNDER_SCRUTINY").length,
      eds: applications.filter((a) => a.status === "EDS").length,
      referred: applications.filter((a) => a.status === "REFERRED").length,
      momGenerated: applications.filter((a) => a.status === "MOM_GENERATED").length,
      finalized: applications.filter((a) => a.status === "FINALIZED").length,
    };

    res.json({ success: true, data: { applications, stats } });
  }
);

// ── Verify Audit Chain (Admin) ────────────────────────────────────────────────
export const verifyAuditChain = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const events = await prisma.auditChain.findMany({ orderBy: { id: "asc" } });
    const crypto = await import("crypto");

    let prevHash = "GENESIS";
    const errors: number[] = [];

    for (const event of events) {
      const payloadHash = crypto.createHash("sha3-256").update(JSON.stringify(event.payload)).digest("hex");
      const expectedChainHash = crypto.createHash("sha3-256").update(prevHash + payloadHash).digest("hex");

      if (event.payloadHash !== payloadHash || event.chainHash !== expectedChainHash || event.prevHash !== prevHash) {
        errors.push(event.id);
      }
      prevHash = event.chainHash;
    }

    res.json({
      success: true,
      data: {
        totalEvents: events.length,
        valid: errors.length === 0,
        tamperedEventIds: errors,
      },
    });
  }
);
