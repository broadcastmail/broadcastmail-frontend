"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/onboarding/spinner";
import { CheckIcon } from "@/components/onboarding/check-icon";

export type SendStep = "saving" | "sending" | "done";

const STEPS: { id: SendStep; label: string }[] = [
  { id: "saving", label: "Saving campaign" },
  { id: "sending", label: "Starting send" },
];

interface SendingOverlayProps {
  step: SendStep | null;
  recipientCount: number;
}

// A dedicated takeover, not just the header button's spinner — sending is
// the one irreversible action in this composer, so it gets a moment of its
// own instead of blending into the same inline state every other save
// does. Not dismissible: no close button, and Escape/outside-click are
// swallowed below, since there's nothing sensible to go "back" to mid-send.
export function SendingOverlay({ step, recipientCount }: SendingOverlayProps) {
  const order: SendStep[] = ["saving", "sending", "done"];
  const currentIndex = step ? order.indexOf(step) : -1;

  return (
    <Dialog open={step !== null}>
      <DialogContent
        showClose={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-5 py-9 text-center"
      >
        {step === "done" ? (
          <div className="flex items-center justify-center size-9 rounded-full bg-[#0F1A15] border border-[#1E3A2E]">
            <CheckIcon size={16} strokeWidth={2.5} />
          </div>
        ) : (
          <Spinner size={26} className="border-[#26262F] border-t-orange" />
        )}

        <div className="flex flex-col gap-1">
          <p className="text-[14.5px] font-semibold text-[#ECECF1]">
            {step === "done" ? "Campaign sent" : "Sending your campaign…"}
          </p>
          <p className="text-[12.5px] text-[#8E8E9A]">
            {recipientCount.toLocaleString()} recipients
          </p>
        </div>

        <div className="flex flex-col gap-2 self-stretch text-left text-[12.5px]">
          {STEPS.map((s) => {
            const stepIndex = order.indexOf(s.id);
            const complete = currentIndex > stepIndex;
            const active = currentIndex === stepIndex;
            return (
              <div key={s.id} className="flex items-center gap-2">
                {complete ? (
                  <CheckIcon size={11} />
                ) : active ? (
                  <Spinner size={11} className="border-[#26262F] border-t-orange" />
                ) : (
                  <div className="size-[11px] rounded-full border border-[#26262F]" />
                )}
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
