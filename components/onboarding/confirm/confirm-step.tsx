"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/onboarding/check-icon";
import { Spinner } from "@/components/onboarding/spinner";

interface ConfirmStepProps {
  projectRef: string | null;
  confirmedTable: string | null;
  fromAddress: string | null;
}

export function ConfirmStep({
  projectRef,
  confirmedTable,
  fromAddress,
}: ConfirmStepProps) {
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    // Same redirect-follow pattern as select-project: the real endpoint
    // 302s to /dashboard once the session cookie is promoted.
    const res = await fetch("/api/v1/onboarding/complete", { method: "POST" });
    window.location.href = new URL(res.url).pathname;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          You&apos;re set up
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A] text-pretty">
          {projectRef ? (
            <>
              <span className="font-mono text-[12.5px] text-[#CBCBD4]">
                {projectRef}
              </span>{" "}
              is connected and ready to send through Resend.
            </>
          ) : (
            "Your project is connected and ready to send through Resend."
          )}
        </p>
      </div>

      <div className="flex flex-col gap-[9px] bg-[#0F1A15] border border-[#1E3A2E] rounded-lg p-3 text-[12.5px] text-[#8E8E9A]">
        <div className="flex gap-2 items-baseline">
          <CheckIcon size={11} />
          Users synced from auth.users
        </div>
        <div className="flex gap-2 items-baseline">
          <CheckIcon size={11} />
          {confirmedTable
            ? `${confirmedTable} connected for campaign filters`
            : "Schema access confirmed"}
        </div>
        <div className="flex gap-2 items-baseline">
          <CheckIcon size={11} />
          {fromAddress
            ? `Sending from ${fromAddress} via Resend`
            : "Email provider connected"}
        </div>
      </div>

      <button
        type="button"
        onClick={handleFinish}
        disabled={finishing}
        className="flex items-center justify-center gap-2 bg-orange hover:bg-orange-hover text-[#120C06] text-[14px] font-semibold rounded-lg py-3 cursor-pointer transition-colors disabled:cursor-wait"
      >
        {finishing && (
          <Spinner className="border-[rgba(18,12,6,0.3)] border-t-[#120C06]" />
        )}
        {finishing ? "Finishing up…" : "Go to campaigns"}
      </button>
    </div>
  );
}
