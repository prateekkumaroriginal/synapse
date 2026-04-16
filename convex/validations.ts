import { z } from "zod";

export const projectCreateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must be at most 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .transform((s) => {
      const t = s.trim();
      return t.length > 0 ? t : undefined;
    }),
});

export type ProjectCreateFormValues = z.input<typeof projectCreateFormSchema>;
export type ProjectCreateParsed = z.output<typeof projectCreateFormSchema>;

export const ticketCreateFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .transform((s) => {
      const t = s.trim();
      return t.length > 0 ? t : undefined;
    }),
  type: z.enum(["TASK", "BUG"]),
});

export type TicketCreateFormValues = z.input<typeof ticketCreateFormSchema>;
export type TicketCreateParsed = z.output<typeof ticketCreateFormSchema>;

export const emailPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export type EmailPasswordFormValues = z.infer<typeof emailPasswordFormSchema>;
