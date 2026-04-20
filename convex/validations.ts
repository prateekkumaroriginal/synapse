import { z } from "zod";

const titleField = ({
  minLength = 2,
  maxLength = 200,
  label = "Title"
} = {}) => z
  .string()
  .trim()
  .min(minLength, minLength === 1 ? `${label} is required` : `${label} must be at least ${minLength} characters`)
  .max(maxLength, `${label} must be at most ${maxLength} characters`);

const descriptionField = ({
  maxLength = 1000,
  fieldName = "Description"
} = {}) => z
  .string()
  .max(maxLength, `${fieldName} must be at most ${maxLength} characters`)
  .optional()
  .transform((s) => {
    if (!s) return undefined;
    const t = s.trim();
    return t.length > 0 ? t : undefined;
  });

export const projectFormSchema = z.object({
  name: titleField({label: "Name"}),
  description: descriptionField(),
});

export type ProjectFormValues = z.input<typeof projectFormSchema>;
export type ProjectFormParsed = z.output<typeof projectFormSchema>;


export const ticketCreateFormSchema = z.object({
  title: titleField(),
  description: descriptionField(),
  type: z.enum(["TASK", "BUG"]),
});

export type TicketCreateFormValues = z.input<typeof ticketCreateFormSchema>;
export type TicketCreateParsed = z.output<typeof ticketCreateFormSchema>;

export const emailPasswordFormSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export type EmailPasswordFormValues = z.infer<typeof emailPasswordFormSchema>;

export const signUpFormSchema = emailPasswordFormSchema.extend({
  name: titleField({label: "Name", minLength: 1, maxLength: 100}),
});

export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
