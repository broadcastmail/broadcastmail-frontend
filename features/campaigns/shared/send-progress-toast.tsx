"use client";

import {useEffect, useRef} from "react";
import {AlertTriangle, Check, RotateCcw, X} from "lucide-react";
import type {CampaignStatus} from "@/lib/types/campaigns";
import {TERMINAL_CAMPAIGN_STATUSES} from "@/lib/types/campaigns";
import {Spinner} from "@/components/onboarding/spinner";
import type {LiveEntry} from "./live-status";

interface SendProgressToastProps {
  entry: LiveEntry;
  onDismiss: () => void;
  onRetry?: () => void;
  retrying?: boolean;
  retryError?: string;
}

const DISMISS_DELAY_MS = 6500;

function statusLabel(status: CampaignStatus): string {
  if (status === "RESOLVING") return "Resolving recipients";
  if (status === "FAILED") return "Send failed";
  if (status === "PARTIALLY_FAILED") return "Partially sent";
  if (status === "SENT") return "Campaign sent";
  return "Sending campaign";
}

function badgeBg(status: CampaignStatus): string {
  if (status === "FAILED" || status === "PARTIALLY_FAILED") return "bg-status-failed-bg";
  if (status === "SENT") return "bg-status-sent-bg";
  return "bg-status-resolving-bg";
}

function StatusIcon({ status }: { status: CampaignStatus }) {
  if (!TERMINAL_CAMPAIGN_STATUSES.has(status))
    return <Spinner size={15} className="border-orange/30 border-t-orange" />;
  if (status === "FAILED")
    return <X size={17} className="text-status-failed" />;
  if (status === "PARTIALLY_FAILED")
    return <AlertTriangle size={17} className="text-status-failed" />;
  return <Check size={17} className="text-status-sent" />;
}

function ProgressBar({ status, sent, total }: { status: CampaignStatus; sent: number; total: number }) {
  if (status === "RESOLVING") {
    return (
      <div className="h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-orange animate-[bmbar_1.4s_ease-in-out_infinite]" />
      </div>
    );
  }
  if (total > 0) {
    const barColor = status === "FAILED" || status === "PARTIALLY_FAILED" ? "bg-status-failed" : "bg-orange";
    return (
      <div className="h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(sent / total, 1) * 100}%` }}
        />
      </div>
    );
  }
  return null;
}

function RetryAction({ onRetry, retrying, retryError }: { onRetry: () => void; retrying: boolean; retryError?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="self-start flex items-center gap-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {retrying ? <Spinner size={11} className="border-white/20 border-t-white/60" /> : <RotateCcw size={11} />}
        {retrying ? "Retrying…" : "Retry again"}
      </button>
      {retryError && (
        <span className="text-[11px] text-status-failed leading-tight">{retryError}</span>
      )}
    </div>
  );
}

export function SendProgressToast({ entry, onDismiss, onRetry, retrying = false, retryError }: Readonly<SendProgressToastProps>) {
  const { event, name } = entry;
  const isTerminal = TERMINAL_CAMPAIGN_STATUSES.has(event.status);
  const canRetry = (event.status === "FAILED" || event.status === "PARTIALLY_FAILED") && !!onRetry;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isTerminal || retrying) return;
    timerRef.current = setTimeout(onDismiss, DISMISS_DELAY_MS);
    return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
  }, [isTerminal, retrying, onDismiss]);

  const sent = event.sentCount ?? 0;
  const total = event.recipientsCount ?? 0;

  return (
    <div className="pointer-events-auto w-[360px] rounded-[14px] border border-(--color-border) bg-[#111116] shadow-[0_24px_60px_rgba(0,0,0,0.6)] overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3.5">

        <div className={`shrink-0 w-10 h-10 rounded-[11px] flex items-center justify-center ${badgeBg(event.status)}`}>
          <StatusIcon status={event.status} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2.5 pt-0.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-text-muted">
                {statusLabel(event.status)}
              </span>
              <span className="text-[13.5px] font-semibold text-text-primary tracking-[-0.01em] truncate">
                {name}
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-2 pt-px">
              {event.status !== "RESOLVING" && total > 0 && (
                <span className="font-mono text-[11.5px] tabular-nums text-text-muted">
                  {sent.toLocaleString()}<span className="text-text-dim">/{total.toLocaleString()}</span>
                </span>
              )}
              {isTerminal && (
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss"
                  className="w-5 h-5 flex items-center justify-center rounded-md text-text-dim hover:text-text-muted hover:bg-white/[0.06] transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {canRetry
            ? <RetryAction onRetry={onRetry!} retrying={retrying} retryError={retryError} />
            : <ProgressBar status={event.status} sent={sent} total={total} />}
        </div>

      </div>
    </div>
  );
}
