import { notFound } from "next/navigation";
import { ScenarioSwitcher } from "@/components/dev/scenario-switcher";

// Dev-only — 404s in production (and in any build where NODE_ENV isn't
// literally "development", so a `next build && next start` locally also
// won't serve this). See mocks/scenarios.ts for what each button actually
// sets and why this exists.
export default function DevScenariosPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10 flex justify-center">
      <div className="w-full max-w-[560px] flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.01em]">
            Dev scenarios
          </h1>
          <p className="text-[13px] leading-[1.55] text-text-muted">
            Sets a complete, named cookie state — not a diff from whatever
            you have now — then reloads. See mocks/scenarios.ts to add or
            edit one.
          </p>
        </div>
        <ScenarioSwitcher />
      </div>
    </div>
  );
}
