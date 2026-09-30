"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_STEP_PATH } from "@/lib/onboarding-steps";
import { CheckIcon } from "@/components/onboarding/check-icon";
import { EmailProviderConnectForm } from "./email-provider-connect-form";

interface EmailProviderFormProps {
  connectedTable: string | null;
}

export function EmailProviderForm({ connectedTable }: EmailProviderFormProps) {
  const router = useRouter();
  // Just gates the "Finish setup" button below — the actual connect+verify
  // mechanics (fields, the idle/testing/verified states, the API call)
  // live in EmailProviderConnectForm, shared with
  // components/settings/email-provider-dialog.tsx.
  const [verified, setVerified] = useState(false);

  function handleFinish() {
    if (!verified) return;
    router.push(ONBOARDING_STEP_PATH.CONFIRM_ACCOUNT);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 bg-[#0F1A15] border border-[#1E3A2E] rounded-lg p-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#4ADE80]">
          <CheckIcon size={14} strokeWidth={2} />
          Secure access configured
        </div>
        {connectedTable && (
          <p className="text-[12.5px] leading-[1.6] text-[#8E8E9A]">
            <span className="text-[#CBCBD4]">{connectedTable}</span> connected
            via a read-only role.
          </p>
        )}
      </div>

      <EmailProviderConnectForm
        heading="Now connect your email provider"
        onConnected={() => setVerified(true)}
      />

      <button
        type="button"
        onClick={handleFinish}
        disabled={!verified}
        className="flex items-center justify-center box-border text-[14px] font-semibold rounded-lg py-3 transition-colors disabled:cursor-not-allowed bg-orange hover:not-disabled:bg-orange-hover text-[#120C06] disabled:bg-[#17171D] disabled:text-[#4C4C58]"
      >
        Finish setup
      </button>
    </div>
  );
}
