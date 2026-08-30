import { AlertTriangle } from "lucide-react";
import type { EmailWarning } from "@/lib/campaigns/email-html";

interface EmailWarningsProps {
  warnings: EmailWarning[];
}

export function EmailWarnings({ warnings }: EmailWarningsProps) {
  if (!warnings.length) return null;

  return (
    <div className="flex flex-col gap-[7px] mt-0.5">
      {warnings.map((w) => (
        <div
          key={w.id}
          className="flex gap-2 items-baseline text-[12px] leading-[1.5] text-orange"
        >
          <AlertTriangle
            size={11}
            className="shrink-0 translate-y-[1px]"
            strokeWidth={1.5}
          />
          {w.text}
        </div>
      ))}
    </div>
  );
}
