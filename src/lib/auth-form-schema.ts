import { z } from "zod";

export const emailPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z
    .string()
    .min(4, "Password must be at least 4 characters")
    .max(16, "Password must be at most 16 characters"),
});

export type EmailPasswordFormValues = z.infer<typeof emailPasswordFormSchema>;
