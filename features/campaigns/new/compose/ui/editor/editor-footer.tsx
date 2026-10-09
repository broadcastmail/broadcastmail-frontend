"use client";

import {ChevronRight} from "lucide-react";
import {cn, formatBytes} from "@/lib/utils";
import {GMAIL_CLIP_BYTES} from "@/features/campaigns/new/compose/lib/email-html";

interface EditorFooterProps {
  sizeBytes: number;
  wordCount: number;
  tipsOpen: boolean;
  onToggleTips: () => void;
}

export function EditorFooter({
  sizeBytes,
  wordCount,
  tipsOpen,
  onToggleTips,
}: Readonly<EditorFooterProps>) {
  const ratio = sizeBytes / GMAIL_CLIP_BYTES;
  let sizeColor = "text-[#5C5C66]";
  if (ratio > 1) sizeColor = "text-[#E5726A]";
  else if (ratio > 0.8) sizeColor = "text-orange";

  return (
    <div className="flex items-center justify-between px-3 py-[7px] border-t border-[#1E1E26] font-mono text-[11px] text-[#5C5C66]">
      <div className="flex items-center gap-3">
        <span
          className={cn("font-medium", sizeColor)}
          title={`${sizeBytes.toLocaleString()} bytes of the ~102 KB Gmail clips at`}
        >
          {formatBytes(sizeBytes)}
        </span>
        <span>{wordCount} words</span>
      </div>
      <button
        type="button"
        onClick={onToggleTips}
        className="flex items-center gap-[5px] font-sans text-[11.5px] text-[#71717D] hover:text-[#B9B9C2] transition-colors cursor-pointer"
      >
        <ChevronRight
          size={9}
          strokeWidth={2}
          className={cn("transition-transform", tipsOpen && "rotate-90")}
        />
        Writing &amp; spam tips
      </button>
    </div>
  );
}
