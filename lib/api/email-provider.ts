import {apiClient} from "@/lib/api/client/client";
import {type EmailProviderFormValues, emailProviderSchema,} from "@/lib/schemas/onboarding";
import type {AccountEmailProviderInfo} from "@/mocks/fixtures";

// No server-only imports — called from the "use client" email-provider form.
export async function connectEmailProvider(
  values: EmailProviderFormValues,
): Promise<void> {
  const payload = emailProviderSchema.parse(values);
  await apiClient.post("/api/v1/onboarding/email-provider", payload);
}

// Client-safe counterpart to lib/api/account.ts's server version.
export async function getAccountEmailProvider(): Promise<AccountEmailProviderInfo | null> {
  try {
    const res = await apiClient.get<AccountEmailProviderInfo>(
      "/api/v1/account/email-provider",
    );
    return res.data;
  } catch {
    return null;
  }
}
