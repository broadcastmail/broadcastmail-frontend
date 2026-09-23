"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { Campaign } from "@/mocks/fixtures";

interface DetailHeaderProps {
  campaign: Campaign;
  previewOpen: boolean;
  onTogglePreview: () => void;
}

export function DetailHeader({
  campaign,
  previewOpen,
  onTogglePreview,
}: DetailHeaderProps) {
  const router = useRouter();
  const { status } = campaign;
  const resolving = status === "RESOLVING";
  const sending = status === "SENDING";
  const deadEnd = status === "FAILED";
  const total = campaign.recipientCount ?? 0;

  const metaLine = deadEnd
    ? `Attempted ${format(new Date(campaign.createdAt), "MMM d · HH:mm")} · resolution failed`
    : sending
      ? `Started ${format(new Date(campaign.createdAt), "MMM d · HH:mm")} · ${total.toLocaleString()} recipients`
      : campaign.sentAt
        ? `Sent ${format(new Date(campaign.sentAt), "MMM d · HH:mm")} · ${total.toLocaleString()} recipients`
        : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.02em] whitespace-nowrap overflow-hidden text-ellipsis">
            {campaign.name}
          </h1>
          <StatusBadge status={status} />
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="font-mono text-[12px] text-text-dim hover:text-[#B9B9C2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          ← Campaigns
        </button>
      </div>

      {metaLine && (
        <div className="font-mono text-[12px] text-text-dim">{metaLine}</div>
      )}

      {resolving && (
        <div className="w-55 h-.5 rounded-[1px] bg-white/[0.07] overflow-hidden mt-0.5">
          <div className="w-[30%] h-full rounded-[1px] bg-orange animate-bmbar" />
        </div>
      )}

      {sending && (
        <div className="font-mono text-[12px] text-[#8E8E9A] mt-0.5">
          Sending · {campaign.sentCount.toLocaleString()} of{" "}
          {total.toLocaleString()} delivered
        </div>
      )}

      <button
        type="button"
        onClick={onTogglePreview}
        className="flex items-center gap-1.5 self-start text-[12.5px] text-text-dim hover:text-[#B9B9C2] transition-colors mt-1.5 cursor-pointer"
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 8 8"
          className="transition-transform duration-180"
          style={{ transform: previewOpen ? "rotate(90deg)" : "none" }}
        >
          <path
            d="M2 1 6 4 2 7"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        {previewOpen ? "Hide preview" : "Preview email"}
      </button>
    </div>
  );
}
