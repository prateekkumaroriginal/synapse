import { z } from "zod";

/** Shared client + Convex validation for `projects.create`. */
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
