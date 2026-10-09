"use client";

import {Check} from "lucide-react";
import {cn} from "@/lib/utils";

interface CampaignStepStripProps {
  step: "audience" | "compose";
  audienceConfirmed: boolean;
  onStepChange: (step: "audience" | "compose") => void;
}

export function CampaignStepStrip({
  step,
  audienceConfirmed,
  onStepChange,
}: Readonly<CampaignStepStripProps>) {
  return (
    <div className="shrink-0 h-[46px] flex items-stretch gap-6 px-6 border-b border-white/[0.06]">
      <span className="flex items-center font-mono text-[12px] text-[#5C5C66]">
        New campaign
      </span>
      <span className="w-px my-3.5 bg-white/[0.08]" />
      {(["audience", "compose"] as const).map((item, index) => (
        <button
          key={item}
          type="button"
          onClick={() => onStepChange(item)}
          className={cn(
            "flex items-center gap-2 border-b-2 text-[13px] capitalize",
            step === item
              ? "border-orange text-[#ECECF1]"
              : "border-transparent text-[#7A7A85]",
          )}
        >
          <span className="font-mono text-[11px] text-[#5C5C66]">{index + 1}</span>
          {item}
          {item === "audience" && audienceConfirmed && (
            <Check size={12} strokeWidth={2.5} className="text-orange" aria-label="complete" />
          )}
        </button>
      ))}
    </div>
  );
}
