import { apiClient } from "@/lib/api/client";
import {
  emailProviderSchema,
  type EmailProviderFormValues,
} from "@/lib/schemas/onboarding";

// Deliberately kept out of lib/api/onboarding.ts: that module also holds
// the cookie-forwarding server reads (server-cookies.ts -> next/headers),
// which the App Router refuses to bundle into a Client Component. This
// function is called from the "use client" email-provider form, so it
// needs its own module with no server-only imports in its graph.
//
export async function connectEmailProvider(
  values: EmailProviderFormValues,
): Promise<void> {
  const payload = emailProviderSchema.parse(values);
  await apiClient.post("/api/v1/onboarding/email-provider", payload);
}
