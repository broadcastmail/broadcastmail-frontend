"use client";

import {Dialog, DialogContent} from "@/components/ui/dialog";
import {Spinner} from "@/components/onboarding/spinner";
import {CheckIcon} from "@/components/onboarding/check-icon";

export type SendStage = "saving" | "sending" | "resolving" | "done";

const STAGES: { id: SendStage; label: string }[] = [
  { id: "saving", label: "Saving campaign" },
  { id: "sending", label: "Starting send" },
  { id: "resolving", label: "Resolving recipients" },
];

interface SendingOverlayProps {
  stage: SendStage | null;
  finalCount: number | null;
}

// A dedicated takeover, not just the header button's spinner — sending is
// the one irreversible action in this composer, so it gets a moment of its
// own instead of blending into the same inline state every other save
// does. Not dismissible: no close button, and Escape/outside-click are
// swallowed below, since there's nothing sensible to go "back" to mid-send.
export function SendingOverlay({ stage, finalCount }: Readonly<SendingOverlayProps>) {
  const order: SendStage[] = ["saving", "sending", "resolving", "done"];
  const currentIndex = stage ? order.indexOf(stage) : -1;
  let heading = "Sending your campaign…";
  if (stage === "done") heading = "Campaign sent";
  else if (stage === "resolving") heading = "Resolving recipients…";

  return (
    <Dialog open={stage !== null}>
      <DialogContent
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-5 py-9 text-center"
      >
        {stage === "done" ? (
          <div className="flex items-center justify-center size-9 rounded-full bg-[#0F1A15] border border-[#1E3A2E]">
            <CheckIcon size={16} strokeWidth={2.5} />
          </div>
        ) : (
          <Spinner size={26} className="border-[#26262F] border-t-orange" />
        )}

        <div className="flex flex-col gap-1">
          <p className="text-[14.5px] font-semibold text-[#ECECF1]">
            {heading}
          </p>
          {finalCount !== null && (
            <p className="text-[12.5px] text-[#8E8E9A]">
              {finalCount.toLocaleString()} recipients
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 self-stretch text-left text-[12.5px]">
          {STAGES.map((s) => {
            const stageIndex = order.indexOf(s.id);
            const complete = currentIndex > stageIndex;
            const active = currentIndex === stageIndex;
            let indicator = <div className="size-[11px] rounded-full border border-[#26262F]" />;
            if (complete) indicator = <CheckIcon size={11} />;
            else if (active) indicator = <Spinner size={11} className="border-[#26262F] border-t-orange" />;
            return (
              <div key={s.id} className="flex items-center gap-2">
                {indicator}
                <span
                  className={
                    complete || active ? "text-[#CBCBD4]" : "text-[#5C5C66]"
                  }
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
