import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Spinner } from "@/components/onboarding/spinner";

// Covers every /onboarding/* route: shown instantly on navigation while the
// next step's page.tsx awaits GET /status (and, on the schema step,
// GET /schema) — the redirect-gate chain between steps otherwise has
// nothing on screen until the server component resolves.
export default function OnboardingLoading() {
  return (
    <OnboardingShell stepLabel="">
      <div className="flex items-center gap-[9px] py-2">
        <Spinner size={14} className="border-[#26262F] border-t-orange" />
        <div className="text-[13px] text-[#8E8E9A]">Loading…</div>
      </div>
    </OnboardingShell>
  );
}
