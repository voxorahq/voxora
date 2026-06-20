import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  company: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  message: z.string().trim().optional().default(""),
});
