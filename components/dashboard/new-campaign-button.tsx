"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@/lib/api/campaigns";
import { EMPTY_DOC } from "@/lib/campaigns/editor-extensions";
import { addSessionDraft } from "@/lib/campaigns/session-drafts";

// "New campaign" used to be a plain <Link> straight to a blank composer
// route — the campaign itself only got created once the user hit Send,
// so navigating away mid-edit (a refresh, a back-button tap) lost
// everything with no way back. This creates a real DRAFT campaign with
// blank values up front and navigates into it by id, so the draft exists
// server-side from the first click — leaving and coming back to
// /dashboard/campaigns/[id] (once there's a dedicated way back into an
// existing draft) resumes it rather than starting over.
export function NewCampaignButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleClick() {
    if (creating) return;
    setCreating(true);
    try {
      const campaign = await createCampaign({
        name: "Untitled campaign",
        subject: "",
        source: "visual",
        bodyJson: EMPTY_DOC,
      });
      addSessionDraft(campaign);
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch {
      // Nothing to show yet beyond letting them try again — this button
      // has no error slot of its own since it's meant to be a fast, almost
      // always-succeeds action, and the composer it fails to create isn't
      // reachable to report into.
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={creating}
      className="flex items-center gap-1.75 bg-orange hover:bg-orange-hover disabled:opacity-60 disabled:cursor-wait text-[#120C06] text-[13.5px] font-semibold rounded-lg px-4 py-2.5 transition-colors whitespace-nowrap"
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
}
