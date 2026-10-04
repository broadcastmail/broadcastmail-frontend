"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/onboarding/spinner";
import { campaignNameSchema } from "@/lib/schemas/campaigns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CampaignHeaderProps {
  name: string;
  onNameChange: (name: string) => void;
  counting: boolean;
  recipientCount: number;
  sending: boolean;
  sendError: boolean;
  canSend: boolean;
  /** False until Settings has a Resend "from" address — see
   *  email-provider-section.tsx. Sending is blocked either way once
   *  `canSend` is false; this just lets the button's tooltip say *why* when
   *  the reason is specifically "Resend isn't connected" rather than an
   *  empty field. */
  resendConfigured: boolean;
  onSend: () => void;
  upgradeRequired: boolean;
  upgrading: boolean;
  onUpgrade: () => void;
  saving: boolean;
  saveError: boolean;
  onSave: () => void;
}

export function CampaignHeader({
  name,
  onNameChange,
  counting,
  recipientCount,
  sending,
  sendError,
  canSend,
  resendConfigured,
  onSend,
  upgradeRequired,
  upgrading,
  onUpgrade,
  saving,
  saveError,
  onSave,
}: Readonly<CampaignHeaderProps>) {
  const [editingName, setEditingName] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const nameResult = campaignNameSchema.safeParse(name);
  const nameError =
    editingName && !nameResult.success
      ? nameResult.error.issues[0]?.message
      : null;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && nameResult.success) setEditingName(false);
    if (e.key === "Escape") setEditingName(false);
  }

  function handleBlur() {
    // Only collapse back to the display state once the name is valid —
    // an empty campaign name has nothing sensible to display in its place.
    if (nameResult.success) setEditingName(false);
  }

  const active = canSend && !sending;

  return (
    <div className="shrink-0 box-border flex items-center justify-between gap-6 px-6 py-[18px] border-b border-white/5">
      <div className="flex-1 min-w-0">
        {editingName ? (
          <div className="flex flex-col gap-1">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              aria-invalid={!!nameError}
              className="w-80 max-w-full box-border bg-[#101015] border border-[#3A3A46] aria-invalid:border-[#E5726A] rounded-lg px-2.5 py-1.5 text-[20px] font-semibold text-[#ECECF1] tracking-[-0.02em] outline-none"
            />
            {nameError && <p className="text-xs text-[#E5726A]">{nameError}</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="inline-flex items-center gap-2 border border-transparent hover:border-[#26262F] rounded-lg px-[9px] py-[5px] -ml-[9px] text-[20px] font-semibold text-[#ECECF1] tracking-[-0.02em] cursor-text transition-colors"
          >
            {name}
            <Pencil size={12} className="opacity-45 shrink-0" />
          </button>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.75 text-[13px] text-[#8E8E9A] whitespace-nowrap">
            {counting && (
              <Spinner size={11} className="border-[#26262F] border-t-orange" />
            )}
            Send to{" "}
            <span className="font-mono text-[#ECECF1] [font-variant-numeric:tabular-nums]">
              {recipientCount.toLocaleString()}
            </span>{" "}
            recipients
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || sending}
            title="Save progress now, without waiting for autosave"
            className="flex items-center justify-center gap-1.5 box-border bg-transparent border border-white/[0.13] text-[#B9B9C2] text-[13px] font-medium rounded-lg px-3.5 py-2.5 whitespace-nowrap transition-colors hover:border-white/[0.24] hover:text-text-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving && (
              <Spinner size={11} className="border-[#26262F] border-t-orange" />
            )}
            {saving ? "Saving…" : "Save"}
          </button>
          {upgradeRequired ? (
            <UpgradeButton upgrading={upgrading} onUpgrade={onUpgrade} />
          ) : (
            <SendCampaignButton
              active={active}
              sending={sending}
              resendConfigured={resendConfigured}
              onSend={onSend}
            />
          )}
        </div>
        {sendError && (
          <div className="text-[12.5px] text-[#E5726A] text-right">
            Couldn&apos;t start your campaign. Try again.
          </div>
        )}
        {saveError && !sendError && (
          <div className="text-[12.5px] text-[#E5726A] text-right">
            Couldn&apos;t save. Try again.
          </div>
        )}
      </div>
    </div>
  );
}

interface SendCampaignButtonProps {
  active: boolean;
  sending: boolean;
  resendConfigured: boolean;
  onSend: () => void;
}

function SendCampaignButton({ active, sending, resendConfigured, onSend }: Readonly<SendCampaignButtonProps>) {
  const button = (
    <button
      type="button"
      onClick={onSend}
      aria-disabled={!active}
      className={cn(
        "flex items-center justify-center gap-1.75 box-border text-[13.5px] font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap transition-colors",
        active
          ? "bg-orange hover:bg-orange-hover text-[#120C06] cursor-pointer"
          : "bg-[#17171D] text-[#4C4C58] cursor-not-allowed",
      )}
    >
      {sending && (
        <Spinner size={12} className="border-[#120C06]/30 border-t-[#120C06]" />
      )}
      {sending ? "Sending…" : "Send campaign"}
    </button>
  );

  // Only explain the specific "Resend isn't connected" reason — other
  // disabled states (missing fields, already sending) are self-evident
  // from the rest of the header, same as before this got a tooltip.
  if (resendConfigured || sending) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>Connect Resend in Settings before sending</TooltipContent>
    </Tooltip>
  );
}

interface UpgradeButtonProps {
  upgrading: boolean;
  onUpgrade: () => void;
}

function UpgradeButton({ upgrading, onUpgrade }: Readonly<UpgradeButtonProps>) {
  const button = (
    <button
      type="button"
      onClick={onUpgrade}
      disabled={upgrading}
      className="flex items-center justify-center gap-1.75 box-border bg-orange hover:not-disabled:bg-orange-hover text-[#120C06] text-[13.5px] font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer"
    >
      {upgrading && (
        <Spinner size={12} className="border-[#120C06]/30 border-t-[#120C06]" />
      )}
      {upgrading ? "Redirecting…" : "Upgrade to Pro →"}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>Audience filters require Pro</TooltipContent>
    </Tooltip>
  );
}
