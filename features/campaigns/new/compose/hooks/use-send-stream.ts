"use client";

import {useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {confirmCampaign} from "@/features/campaigns/api/campaigns";
import {updateSessionDraft} from "@/features/campaigns/shared/session-drafts";
import type {CampaignStatusEvent} from "@/lib/types/campaigns";
import type {SendContext} from "@/features/campaigns/new/compose/ui/compose-step";
import type {SendStage} from "@/features/campaigns/new/compose/ui/sending-overlay";

const SSE_TIMEOUT_MS = 5 * 60 * 1000;

interface SendState {
  stage: SendStage | null;
  finalCount: number | null;
}

const IDLE: SendState = { stage: null, finalCount: null };

interface UseSendStreamOptions {
  campaignId: string;
  recipientCount: number;
}

export interface SendStream extends SendState {
  send: (ctx: SendContext) => Promise<void>;
}

export function useSendStream({
  campaignId,
  recipientCount,
}: UseSendStreamOptions): SendStream {
  const router = useRouter();
  const [state, setState] = useState<SendState>(IDLE);
  const esRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep recipientCount fresh for the send call
  const recipientCountRef = useRef(recipientCount);
  recipientCountRef.current = recipientCount;

  function closeStream() {
    esRef.current?.close();
    esRef.current = null;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function finishAndRedirect(count: number | null, name: string, subject: string) {
    closeStream();
    setState({ stage: "done", finalCount: count });
    updateSessionDraft(campaignId, { name, subject, status: "SENDING" });
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  async function send({ saveNow, name, subject }: SendContext) {
    if (state.stage) return;
    setState({ stage: "saving", finalCount: null });
    try {
      await saveNow();
      setState({ stage: "sending", finalCount: null });
      await confirmCampaign(campaignId, recipientCountRef.current);
      setState({ stage: "resolving", finalCount: null });

      const es = new EventSource(`/api/v1/campaigns/${campaignId}/status/stream`);
      esRef.current = es;

      timeoutRef.current = setTimeout(() => finishAndRedirect(null, name, subject), SSE_TIMEOUT_MS);

      es.addEventListener("status", (e: MessageEvent) => {
        const event = JSON.parse(e.data) as CampaignStatusEvent;
        const { status, recipientsCount } = event;
        if (
          status === "SENDING" ||
          status === "SENT" ||
          status === "PARTIALLY_FAILED" ||
          status === "FAILED"
        ) {
          finishAndRedirect(recipientsCount, name, subject);
        }
      });

      es.onerror = () => finishAndRedirect(null, name, subject);
    } catch (err) {
      closeStream();
      console.error(`Failed to send campaign ${campaignId}`, err);
      setState(IDLE);
    }
  }

  return { ...state, send };
}
