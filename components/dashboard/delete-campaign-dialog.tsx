"use client";

import {useState} from "react";
import {Campaign} from "@/lib/types/campaigns";
import {AlertDialog, AlertDialogContent, AlertDialogFooter,} from "@/components/ui/alert-dialog";
import {isAxiosError} from "axios";
import {apiClient} from "@/lib/api/client/client";
import {removeSessionDraft} from "@/features/campaigns/shared/session-drafts";

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onDeleted: () => void;
}

function warningFor(campaign: Campaign): string {
  if (campaign.status === "DRAFT")
    return "This campaign hasn't been sent. It will be permanently deleted.";
  if (campaign.status === "RESOLVING" || campaign.status === "SENDING")
    return "This campaign is currently active. Deleting it will stop sending immediately.";
  return `This campaign was sent to ${campaign.recipientCount?.toLocaleString()} recipients. Delivery data will be permanently deleted.`;
}

export function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onDeleted,
}: Readonly<DeleteCampaignDialogProps>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(value: boolean) {
    if (loading) return;
    onOpenChange(value);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await apiClient.delete(`/api/v1/campaigns/${campaign.id}`);
      removeSessionDraft(campaign.id);
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 403
          ? "This campaign isn't a draft anymore, so it can't be deleted."
          : "Couldn't delete this campaign. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        style={{ background: "#111116" }}
        className="border border-(--color-border) rounded-[14px] p-5.5 w-100 flex flex-col gap-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-col gap-1">
          <div className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-text-muted">
            Delete campaign
          </div>
          <div className="text-[16px] font-semibold text-text-primary tracking-[-0.01em]">
            {campaign.name}
          </div>
        </div>
        <div className="text-[13.5px] leading-[1.55] text-[#B9B9C2]">
          {warningFor(campaign)}
        </div>
        {error && (
          <div className="text-[12.5px] leading-normal text-status-failed">
            {error}
          </div>
        )}
        <AlertDialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex items-center justify-center bg-transparent border border-white/13 text-[#B9B9C2] text-[13px] font-medium rounded-lg px-3.5 py-2 hover:border-white/24 hover:text-text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center justify-center gap-1.75 bg-status-failed text-[#1A0B0A] text-[13px] font-semibold rounded-lg px-4 py-2 hover:bg-[#F0857D] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && (
              <div className="w-3 h-3 border-2 border-[rgba(26,11,10,0.3)] border-t-[#1A0B0A] rounded-full animate-spin" />
            )}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
