import { NextFunction, Request, Response } from "express";
import { z, ZodTypeAny } from "zod";
import { AppError } from "./errorHandler";

type RequestParts = {
  body?: Request["body"];
  params?: Request["params"];
};

export const validate = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return next(new AppError(firstError, 400));
    }

    const data = parsed.data as RequestParts;

    req.body = data.body ?? req.body;
    req.params = data.params ?? req.params;
    next();
  };
};
