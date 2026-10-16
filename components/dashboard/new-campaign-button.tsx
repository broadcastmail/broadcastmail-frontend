"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {createCampaign} from "@/features/campaigns/api/campaigns";
import {addSessionDraft} from "@/features/campaigns/shared/session-drafts";
import {Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

interface NewCampaignButtonProps {
  configured: boolean;
}

export function NewCampaignButton({ configured }: Readonly<NewCampaignButtonProps>) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    if (creating || !configured) return;
    setCreating(true);
    try {
      const campaign = await createCampaign({
        name: "Untitled campaign",
        subject: "",
        bodyHtml: "",
      });
      addSessionDraft(campaign);
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch {
      toast.error("Couldn't create campaign — try again.");
      setCreating(false);
    }
  }

  const disabled = creating || !configured;

  const button = (
    <button
      type="button"
      onClick={handleClick}
      aria-disabled={disabled}
      className={cn(
        "flex items-center gap-1.75 bg-orange text-[#120C06] text-[13.5px] font-semibold rounded-lg px-4 py-2.5 transition-colors whitespace-nowrap",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-orange-hover cursor-pointer",
      )}
    >
      <svg width="13" height="13" viewBox="0 0 14 14">
        <path
          d="M7 2v10M2 7h10"
          stroke="#120C06"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {creating ? "Creating…" : "New campaign"}
    </button>
  );

  if (configured) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>
        Connect Supabase (project, user table and email column) before creating
        a campaign
      </TooltipContent>
    </Tooltip>
  );
}
