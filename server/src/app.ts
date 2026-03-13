import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth, requireRole } from "./middleware/auth";
import applicationRoutes from "./routes/applications/application.routes";
import authRoutes from "./routes/auth/auth.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationRoutes);
app.get("/admin", requireAuth, requireRole(["ADMIN"]), (_req, res) => {
	res.json({ success: true, data: { message: "Admin route ok" } });
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use(errorHandler);