import { Response } from "express";
import { prisma } from "../utils/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import { writeAuditEvent } from "../utils/audit";
import { createNotification } from "../services/notification.service";

// ── Initiate Payment (Proponent) ───────────────────────────────────────────────
export const initiatePayment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { applicationId } = req.body as { applicationId: string };
    if (!applicationId) throw new AppError("applicationId required", 400);

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new AppError("Application not found", 404);
    if (app.proponentId !== req.user!.userId) throw new AppError("Forbidden", 403);
    if (app.status !== "SUBMITTED") throw new AppError("Application must be in SUBMITTED state", 400);

    // Check if payment already exists
    const existing = await prisma.payment.findUnique({ where: { applicationId } });
    if (existing) {
      return res.json({ success: true, data: { payment: existing } });
    }

    // Calculate fee based on area (simplified rule: ₹1000/ha, min ₹5000)
    const areaHa = app.areaHa ?? 1;
    const amount = Math.max(5000, Math.round(areaHa * 1000));

    // UPI payment details for CECB
    const upiId = "cecb.cg@icicipay";
    const upiQrData = `upi://pay?pa=${upiId}&pn=CECB+CG&am=${amount}&cu=INR&tn=EC+App+${applicationId.slice(0, 8)}`;

    const payment = await prisma.payment.create({
      data: {
        applicationId,
        amount,
        qrCodeUrl: upiQrData,
      },
    });

    // Update application fee amount
    await prisma.application.update({
      where: { id: applicationId },
      data: { feeAmount: amount },
    });

    res.status(201).json({ success: true, data: { payment } });
  }
);

// ── Get Payment (any authenticated user with access) ──────────────────────────
export const getPayment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const applicationId = String(req.params.applicationId);
    const payment = await prisma.payment.findUnique({ where: { applicationId } });
    if (!payment) throw new AppError("Payment not found", 404);
    res.json({ success: true, data: { payment } });
  }
);

// ── Verify Payment (Scrutiny Team) ────────────────────────────────────────────
export const verifyPayment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const applicationId = String(req.params.applicationId);
    const { utrNumber } = req.body as { utrNumber: string };

    if (!utrNumber || utrNumber.trim().length < 6) {
      throw new AppError("Valid UTR number required (min 6 chars)", 400);
    }

    const payment = await prisma.payment.findUnique({ where: { applicationId }, include: { application: true } });
    if (!payment) throw new AppError("Payment not found", 404);
    if (payment.verified) throw new AppError("Payment already verified", 400);

    const updated = await prisma.payment.update({
      where: { applicationId },
      data: {
        verified: true,
        utrNumber: utrNumber.trim(),
        verifiedBy: req.user!.userId,
        verifiedAt: new Date(),
      },
    });

    // Update application feePaid
    await prisma.application.update({ where: { id: applicationId }, data: { feePaid: true } });

    await writeAuditEvent({
      eventType: "PAYMENT_VERIFIED",
      actorId: req.user!.userId,
      applicationId,
      payload: { utrNumber, amount: payment.amount },
    });

    await createNotification(payment.application.proponentId, applicationId, "PAYMENT_VERIFIED", "Your payment has been successfully verified.");

    res.json({ success: true, data: { payment: updated } });
  }
);
