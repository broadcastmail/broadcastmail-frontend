"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { SectionCard } from "@/components/layout/section-card";
import { FieldRow } from "@/components/layout/field-row";
import { EmailProviderDialog } from "./email-provider-dialog";
import type { AccountEmailProviderInfo } from "@/mocks/fixtures";

interface EmailProviderSectionProps {
  emailProvider: AccountEmailProviderInfo | null;
}

export function EmailProviderSection({
  emailProvider,
}: EmailProviderSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <SectionCard title="Email provider">
      <FieldRow label="From address">
        <span
          className={
            emailProvider?.fromAddress
              ? "font-mono text-[13px] text-[#CBCBD4]"
              : "font-mono text-[13px] text-orange"
          }
        >
          {emailProvider?.fromAddress ?? "Not configured"}
        </span>
      </FieldRow>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.75 bg-transparent border border-white/13 text-[#B9B9C2] text-[12.5px] font-medium rounded-lg px-3.25 py-2 whitespace-nowrap transition-colors hover:border-white/24 hover:text-text-primary cursor-pointer"
        >
          <RefreshCw size={12} />
          Reconfigure
        </button>
      </div>

      <EmailProviderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </SectionCard>
  );
}
