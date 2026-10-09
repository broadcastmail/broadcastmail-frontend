import {redirect} from "next/navigation";
import {getOnboardingStatus} from "@/features/onboarding/api/onboarding";
import {ONBOARDING_STEP_PATH} from "@/lib/onboarding-steps";

// No real backend redirect ever lands here directly — every OAuth outcome
// targets a specific step route. This exists as a resume entry point: if
// someone lands on bare /onboarding (bookmark, manual nav), send them to
// wherever their session actually is.
export default async function OnboardingIndexPage() {
  const status = await getOnboardingStatus();
  redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
}
