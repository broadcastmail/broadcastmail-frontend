import {redirect} from "next/navigation";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {OnboardingStatusResponse, SchemaIntrospectionResult} from "@/lib/types/onboarding";
import {ONBOARDING_STEP_PATH} from "@/lib/onboarding-steps";
import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {SchemaFlow} from "@/components/onboarding/schema/schema-flow";

export default async function SchemaPage() {
  const serverApiClient = await createServerApiClient();
  let status: OnboardingStatusResponse | null = null;
  try {
    const res = await serverApiClient.get<OnboardingStatusResponse>("/api/v1/onboarding/status");
    status = res.data;
  } catch { /* ignore */ }
  if (status?.step !== "CONFIRM_SCHEMA") {
    redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
  }

  const schema = await serverApiClient.get<SchemaIntrospectionResult>("/api/v1/onboarding/schema").then((r) => r.data).catch(() => null);

  return (
    <OnboardingShell stepLabel="step 1 / 2">
      <SchemaFlow schema={schema} />
    </OnboardingShell>
  );
}
