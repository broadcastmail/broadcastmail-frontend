"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RENDER_TIPS, SPAM_TIPS, type EditorTip } from "@/lib/campaigns/tips";

type Tab = "render" | "spam";

function TipRow({ tip }: { tip: EditorTip }) {
  return (
    <div className="flex gap-[9px] items-baseline text-[12.5px] leading-[1.55] text-[#8E8E9A]">
      <div
        className={cn(
          "w-[5px] h-[5px] rounded-full shrink-0 -translate-y-[2px]",
          tip.dot === "good" ? "bg-[#4ADE80]" : "bg-orange",
        )}
      />
      <div>
        <span className="text-[#CBCBD4]">{tip.title}</span> — {tip.text}
      </div>
    </div>
  );
}

// Two tabs on purpose: "renders correctly" and "reaches the inbox" are
// different failure modes with different fixes, so folding them into one
// undifferentiated list would bury the deliverability advice the user
// specifically asked for.
export function TipsPanel() {
  const [tab, setTab] = useState<Tab>("render");
  const tips = tab === "render" ? RENDER_TIPS : SPAM_TIPS;

  return (
    <div className="flex flex-col gap-[10px] box-border bg-[#101015] border border-[#1E1E26] rounded-lg p-[13px] mt-0.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTab("render")}
          className={cn(
            "rounded-md px-[9px] py-[5px] text-[11.5px] font-medium cursor-pointer transition-colors",
            tab === "render"
              ? "bg-white/[0.07] text-[#ECECF1]"
              : "text-[#71717D] hover:text-[#B9B9C2]",
          )}
        >
          Writing tips
        </button>
        <button
          type="button"
          onClick={() => setTab("spam")}
          className={cn(
            "rounded-md px-[9px] py-[5px] text-[11.5px] font-medium cursor-pointer transition-colors",
            tab === "spam"
              ? "bg-white/[0.07] text-[#ECECF1]"
              : "text-[#71717D] hover:text-[#B9B9C2]",
          )}
        >
          Avoid the spam folder
        </button>
      </div>
      <div className="flex flex-col gap-[9px]">
        {tips.map((tip) => (
          <TipRow key={tip.title} tip={tip} />
        ))}
      </div>
    </div>
  );
}
