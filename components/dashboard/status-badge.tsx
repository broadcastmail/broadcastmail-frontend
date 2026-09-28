"use client";

import type { CampaignStatus } from "@/mocks/fixtures";

interface StatusBadgeProps {
  status: CampaignStatus;
}

const statusConfig: Record<
  CampaignStatus,
  {
    label: string;
    className: string;
    animate: boolean;
  }
> = {
  RESOLVING: {
    label: "Resolving",
    className: "bg-status-resolving-bg text-status-resolving",
    animate: true,
  },
  SENDING: {
    label: "Sending",
    className: "bg-status-sending-bg text-status-sending",
    animate: false,
  },
  SENT: {
    label: "Sent",
    className: "bg-status-sent-bg text-status-sent",
    animate: false,
  },
  FAILED: {
    label: "Failed",
    className: "bg-status-failed-bg text-status-failed",
    animate: false,
  },
  PARTIALLY_FAILED: {
    label: "Partial",
    className: "bg-status-failed-bg text-status-failed",
    animate: false,
  },
  DRAFT: {
    label: "Draft",
    className: "bg-status-draft-bg text-status-draft",
    animate: false,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.25 px-1.75 py-px rounded-sm font-mono text-[10.5px] font-medium tracking-[0.04em] leading-3.75 uppercase ${config.className} ${config.animate ? "animate-bmpulse" : ""}`}
    >
      <span
        className={`w-1.25 h-1.25 rounded-full shrink-0 bg-current self-center`}
      />
      {config.label}
    </span>
  );
}
