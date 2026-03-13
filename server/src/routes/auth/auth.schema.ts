import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.email("A valid email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
    name: z.string().min(2, "Name is required"),
    role: z.enum(["ADMIN", "PROPONENT", "SCRUTINY", "MOM_TEAM"]).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email("A valid email is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
