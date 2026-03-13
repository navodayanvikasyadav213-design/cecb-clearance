import { Response } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../types";
import { env } from "../config/env";
import { LoginInput, RegisterInput } from "../routes/auth/auth.schema";

const REFRESH_COOKIE = "refreshToken";

function signAccessToken(payload: { userId: string; email: string; role: Role }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

function signRefreshToken(payload: { userId: string; email: string; role: Role }) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await argon2.hash(body.password);
  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      name: body.name,
      role: body.role ?? "PROPONENT",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    data: { user, accessToken },
  });
});

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const valid = await argon2.verify(user.passwordHash, body.password);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: { user: safeUser, accessToken },
  });
});

export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    throw new AppError("Unauthorized", 401);
  }

  let decoded: jwt.JwtPayload;
  try {
    const verified = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (typeof verified === "string") {
      throw new AppError("Unauthorized", 401);
    }
    decoded = verified;
  } catch {
    throw new AppError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: String(decoded.userId) } });
  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email, role: user.role });
  setRefreshCookie(res, refreshToken);

  res.json({ success: true, data: { accessToken } });
});

export const logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  });

  res.json({ success: true, message: "Logged out" });
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    throw new AppError("Unauthorized", 401);
  }

  res.json({ success: true, data: { user } });
});
