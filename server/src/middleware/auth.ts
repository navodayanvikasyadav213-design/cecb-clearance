import { NextFunction, Response } from "express";
import jwt, { JwtPayload as JwtBasePayload } from "jsonwebtoken";
import { AppError } from "./errorHandler";
import { AuthRequest, JwtPayload, Role } from "../types";
import { env } from "../config/env";

function isJwtPayload(value: string | JwtBasePayload): value is JwtBasePayload {
  return typeof value !== "string";
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!isJwtPayload(decoded)) {
      return next(new AppError("Unauthorized", 401));
    }

    const payload: JwtPayload = {
      userId: String(decoded.userId),
      email: String(decoded.email),
      role: decoded.role as Role,
    };

    req.user = payload;
    next();
  } catch {
    next(new AppError("Unauthorized", 401));
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Forbidden: insufficient role", 403));
    }

    next();
  };
}
