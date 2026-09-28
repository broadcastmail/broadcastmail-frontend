"use client";

import { SCENARIOS, applyScenario } from "@/mocks/scenarios";

export function ScenarioSwitcher() {
  return (
    <div className="flex flex-col gap-2.5">
      {SCENARIOS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => applyScenario(s)}
          className="flex flex-col gap-1 text-left box-border bg-white/[0.035] border border-(--color-border) rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer"
        >
          <span className="text-[13.5px] font-medium text-text-primary">
            {s.label}
          </span>
          <span className="text-[12.5px] leading-normal text-text-muted">
            {s.description}
          </span>
        </button>
      ))}
    </div>
  );
}
