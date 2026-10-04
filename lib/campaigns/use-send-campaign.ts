"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmCampaign } from "@/lib/api/campaigns";
import { updateSessionDraft } from "@/lib/campaigns/session-drafts";
import type { SendStep } from "@/components/campaigns/new/sending-overlay";

interface SendState {
  step: SendStep | null;
  error: Error | null;
}

const IDLE: SendState = { step: null, error: null };

interface UseSendCampaignOptions {
  campaignId: string;
  canSend: boolean;
  saveNow: () => Promise<void>;
  name: string;
  subject: string;
  recipientCount: number;
}

export interface SendCampaign extends SendState {
  send: () => Promise<void>;
}

export function useSendCampaign({
  campaignId,
  canSend,
  saveNow,
  name,
  subject,
  recipientCount,
}: UseSendCampaignOptions): SendCampaign {
  const router = useRouter();
  const [state, setState] = useState<SendState>(IDLE);

  async function send() {
    if (state.step || !canSend) return;
    setState({ step: "saving", error: null });
    try {
      await saveNow();
      setState({ step: "sending", error: null });
      await confirmCampaign(campaignId, recipientCount);
      setState({ step: "done", error: null });
      updateSessionDraft(campaignId, { name, subject, status: "SENDING" });
      // Hold on "Campaign sent" for a beat — otherwise the overlay would
      // appear and vanish in the same frame the mocked confirm resolves.
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Failed to send campaign ${campaignId}`, error);
      setState({ step: null, error });
    }
  }

  return { ...state, send };
}
