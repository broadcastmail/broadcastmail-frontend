import { z } from "zod";
import { sanitizeUrl } from "@/lib/campaigns/email-html";

// Shared by the Link/Button dialog form (react-hook-form's zodResolver)
// and the composer's own inserts — normalizes bare domains to https:// and
// rejects anything that isn't an http(s) URL (javascript:, data:, …).
const urlSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter a URL" })
  .transform((value, ctx) => {
    const safe = sanitizeUrl(value);
    if (!safe) {
      ctx.addIssue({ code: "custom", message: "Enter a valid http(s) URL" });
      return z.NEVER;
    }
    return safe;
  });

export const linkFieldsSchema = z.object({
  label: z.string().trim().max(120, { message: "Keep it under 120 characters" }),
  href: urlSchema,
});
export type LinkFieldsValues = z.infer<typeof linkFieldsSchema>;

export const imageFieldsSchema = z.object({
  src: urlSchema,
  alt: z
    .string()
    .trim()
    .min(1, { message: "Alt text is required — most clients block images by default" })
    .max(200, { message: "Keep it under 200 characters" }),
  href: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return "";
      const safe = sanitizeUrl(value);
      if (!safe) {
        ctx.addIssue({ code: "custom", message: "Enter a valid http(s) URL" });
        return z.NEVER;
      }
      return safe;
    }),
});
export type ImageFieldsValues = z.infer<typeof imageFieldsSchema>;

export const campaignNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Give this campaign a name" })
  .max(120, { message: "Keep it under 120 characters" });

export const campaignSubjectSchema = z
  .string()
  .trim()
  .min(1, { message: "Write a subject line" })
  .max(78, { message: "Subject lines over 78 characters get truncated in most inboxes" });
