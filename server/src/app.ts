import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import applicationRoutes from "./routes/applications/application.routes";
import authRoutes from "./routes/auth/auth.routes";
import paymentRoutes from "./routes/payments/payment.routes";
import adminRoutes from "./routes/admin/admin.routes";
import momRoutes from "./routes/mom/mom.routes";
import gisRoutes from "./routes/gis/gis.routes";

export const app = express();

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/applications", momRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/gis", gisRoutes);

app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use(errorHandler);