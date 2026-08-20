import { z } from "zod";

// Shared between the email-provider form (react-hook-form's zodResolver)
// and the API call it submits to — one schema validates both the fields
// as the user types and the request body right before it goes over the
// wire, instead of re-declaring the same constraints twice.
export const emailProviderSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, { message: "Enter your Resend API key" })
    .startsWith("re_", { message: "Resend API keys start with \"re_\"" }),
  fromAddress: z.email({ message: "Enter a valid email address" }),
});

export type EmailProviderFormValues = z.infer<typeof emailProviderSchema>;
