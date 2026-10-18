import {redirect} from "next/navigation";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {OnboardingStatusResponse} from "@/lib/types/onboarding";
import {ONBOARDING_STEP_PATH} from "@/lib/onboarding-steps";

// No real backend redirect ever lands here directly — every OAuth outcome
// targets a specific step route. This exists as a resume entry point: if
// someone lands on bare /onboarding (bookmark, manual nav), send them to
// wherever their session actually is.
export default async function OnboardingIndexPage() {
  let status: OnboardingStatusResponse | null = null;
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<OnboardingStatusResponse>("/api/v1/onboarding/status");
    status = res.data;
  } catch { /* ignore */ }
  redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
}
