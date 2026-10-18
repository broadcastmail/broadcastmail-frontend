import {redirect} from "next/navigation";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {OnboardingStatusResponse, SchemaIntrospectionResult} from "@/lib/types/onboarding";
import {ONBOARDING_STEP_PATH} from "@/lib/onboarding-steps";
import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {EmailProviderForm} from "@/components/onboarding/email-provider/email-provider-form";

export default async function EmailProviderPage() {
  const serverApiClient = await createServerApiClient();
  let status: OnboardingStatusResponse | null = null;
  try {
    const res = await serverApiClient.get<OnboardingStatusResponse>("/api/v1/onboarding/status");
    status = res.data;
  } catch { /* ignore */ }
  if (status?.step !== "CONNECT_RESEND") {
    redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
  }

  const schema = await serverApiClient.get<SchemaIntrospectionResult>("/api/v1/onboarding/schema").then((r) => r.data).catch(() => null);
  const connectedTable =
    schema?.status === "DETECTED"
      ? `${schema.userTableSchema}.${schema.userTableName}`
      : null;

  return (
    <OnboardingShell stepLabel="step 2 / 2">
      <EmailProviderForm connectedTable={connectedTable} />
    </OnboardingShell>
  );
}
