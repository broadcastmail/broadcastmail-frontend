"use client";

import {useRef, useState} from "react";
import type {Campaign} from "@/lib/types/campaigns";
import type {AudienceColumn, CampaignFilterResponse} from "@/features/campaigns/new/audience/audience";
import type {AudienceListResponse} from "@/features/campaigns/api/audience";
import {AudienceStep} from "./audience/ui/audience-step";
import {ComposeStep} from "./compose/ui/compose-step";
import {SendingOverlay} from "./compose/ui/sending-overlay";
import {useSendStream} from "@/features/campaigns/new/compose/hooks/use-send-stream";
import {isFreePlan} from "@/lib/subscription/plans";
import {usePlan} from "@/lib/subscription/plan-context";
import {CampaignStepStrip} from "./campaign-step-strip";
import {UNSAVED_CHANGES_MESSAGE} from "@/lib/navigation/unsaved-changes-guard";
import {cn} from "@/lib/utils";

export interface CampaignData {
  campaign: Campaign;
  audienceColumns: AudienceColumn[];
  initialFilters: CampaignFilterResponse[];
  initialRecipientCount: number;
  initialAudience: AudienceListResponse;
}

interface NewCampaignFormProps {
  data: CampaignData;
  resendConfigured: boolean;
}

export function NewCampaignForm({ data, resendConfigured }: Readonly<NewCampaignFormProps>) {
  const { campaign, initialFilters, initialRecipientCount } = data;
  const plan = usePlan();

  const [step, setStep] = useState<"audience" | "compose">(
    campaign.audienceMode !== null ? "compose" : "audience",
  );
  // null = audience not yet confirmed; number = confirmed (count may be 0)
  const [selectedRecipientCount, setSelectedRecipientCount] = useState<number | null>(() => {
    if (campaign.audienceMode === null) return null;
    if (campaign.audienceMode === "manual") return campaign.includedIds?.length ?? 0;
    if (campaign.audienceMode === "all")
      return Math.max(0, initialRecipientCount - (campaign.excludedIds?.length ?? 0));
    return initialRecipientCount;
  });

  const composeDirtyRef = useRef(false);

  const sendStream = useSendStream({
    campaignId: campaign.id,
    recipientCount: selectedRecipientCount ?? 0,
  });

  const audienceConfirmed = selectedRecipientCount !== null;
  const upgradeRequired = isFreePlan(plan) && initialFilters.length > 0;
  const canSend = audienceConfirmed && resendConfigured && !upgradeRequired;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <CampaignStepStrip
        step={step}
        audienceConfirmed={audienceConfirmed}
        onStepChange={(next) => {
          if (step === "compose" && next === "audience" && composeDirtyRef.current) {
            if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
          }
          setStep(next);
        }}
      />

      {/* Both steps stay mounted so their internal state survives step switches. */}
      <div className={cn(step !== "audience" && "hidden")}>
        <AudienceStep
          data={data}
          onWriteFirst={() => setStep("compose")}
          onConfirm={(count) => {
            setSelectedRecipientCount(count);
            setStep("compose");
          }}
        />
      </div>

      <div className={cn("flex-1 min-h-0 flex flex-col", step !== "compose" && "hidden")}>
        <ComposeStep
          campaign={campaign}
          resendConfigured={resendConfigured}
          state={{ recipientCount: selectedRecipientCount ?? 0, canSend, sending: sendStream.stage !== null }}
          onBack={() => setStep("audience")}
          onSend={sendStream.send}
          onDirtyChange={(dirty) => { composeDirtyRef.current = dirty; }}
        />
      </div>

      <SendingOverlay stage={sendStream.stage} finalCount={sendStream.finalCount} />
    </div>
  );
}
