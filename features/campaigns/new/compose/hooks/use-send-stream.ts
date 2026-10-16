"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {confirmCampaign} from "@/features/campaigns/api/campaigns";
import {updateSessionDraft} from "@/features/campaigns/shared/session-drafts";
import {setLiveStatus} from "@/features/campaigns/shared/live-status";
import type {SendContext} from "@/features/campaigns/new/compose/ui/compose-step";

interface UseSendStreamOptions {
  campaignId: string;
  recipientCount: number;
}

export interface SendStream {
  sending: boolean;
  send: (ctx: SendContext) => Promise<void>;
}

export function useSendStream({ campaignId, recipientCount }: UseSendStreamOptions): SendStream {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function send({ saveNow, name, subject }: SendContext) {
    if (sending) return;
    setSending(true);
    try {
      await saveNow();
      await confirmCampaign(campaignId, recipientCount);
      setLiveStatus(
        {
          id: campaignId,
          name,
          status: "RESOLVING",
          sentCount: 0,
          recipientsCount: recipientCount,
          openedCount: 0,
          deliveredCount: 0,
          bouncedCount: 0,
          failedCount: 0,
        },
        name,
      );
      updateSessionDraft(campaignId, { name, subject, status: "SENDING" });
      router.push("/dashboard");
    } catch (err) {
      console.error(`Failed to send campaign ${campaignId}`, err);
      toast.error("Failed to send — try again.");
      setSending(false);
    }
  }

  return { sending, send };
}
