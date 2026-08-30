"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignHeader } from "./campaign-header";
import { SubjectField } from "./subject-field";
import { EmailEditor, type EmailBody } from "./editor/email-editor";
import { HtmlImportEditor } from "./editor/html-import-editor";
import { AudienceFilters } from "./audience-filters";
import { PreviewPane } from "./preview-pane";
import { SendingOverlay, type SendStep } from "./sending-overlay";
import { Spinner } from "@/components/onboarding/spinner";
import { getCampaign, updateCampaign, confirmCampaign } from "@/lib/api/campaigns";
import { updateSessionDraft } from "@/lib/campaigns/session-drafts";
import { wrapEmailShell } from "@/lib/campaigns/email-html";
import { sanitizeHtmlSource } from "@/lib/campaigns/sanitize-html-source";
import { EMPTY_DOC, jsonToHtml } from "@/lib/campaigns/editor-extensions";
import { cn } from "@/lib/utils";
import {
  estimateRecipientCount,
  TOTAL_AUDIENCE,
  type AudienceFilter,
} from "@/lib/campaigns/audience";

type ContentSource = "visual" | "import";

let filterIdSeq = 0;
const nextFilterId = () => `filter-${++filterIdSeq}`;

interface NewCampaignComposerProps {
  /** The DRAFT campaign this composer edits — created blank the moment
   *  "New campaign" was clicked (see new-campaign-button.tsx), not by this
   *  component. Everything below patches that existing record; nothing
   *  here creates a campaign. */
  campaignId: string;
}

export function NewCampaignComposer({ campaignId }: NewCampaignComposerProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Untitled campaign");
  const [subject, setSubject] = useState("");

  // The two content sources are kept as fully separate state, not one
  // shared `body` string a mode switch converts between — nothing is lost
  // or reinterpreted when you flip between them, and it keeps "composed
  // through our schema" and "someone's own HTML" from ever blurring into
  // the same value (see editor/email-editor.tsx and
  // editor/html-import-editor.tsx for why that distinction matters).
  const [source, setSource] = useState<ContentSource>("visual");
  const [visualBody, setVisualBody] = useState<EmailBody>({
    html: "",
    json: EMPTY_DOC,
  });
  const [importedHtml, setImportedHtml] = useState("");

  const [filters, setFilters] = useState<AudienceFilter[]>([]);
  const [counting, setCounting] = useState(false);
  const [recipientCount, setRecipientCount] = useState(TOTAL_AUDIENCE);
  const [sendStep, setSendStep] = useState<SendStep | null>(null);
  const [sendError, setSendError] = useState(false);

  // Loads the draft this id points to. Runs client-side, not as a
  // server-fetched prop — see app/dashboard/campaigns/[id]/page.tsx for
  // why (the draft was created via a client-side POST, so it only exists
  // in the browser's mock worker). The editor mounts once loading clears,
  // so it seeds from real data on its one and only mount instead of
  // needing to be re-hydrated after the fact.
  useEffect(() => {
    let cancelled = false;
    getCampaign(campaignId)
      .then((campaign) => {
        if (cancelled) return;
        setName(campaign.name);
        setSubject(campaign.subject);
        setSource(campaign.source);
        if (campaign.source === "visual" && campaign.bodyJson) {
          setVisualBody({ html: jsonToHtml(campaign.bodyJson), json: campaign.bodyJson });
        } else if (campaign.source === "import" && campaign.bodyHtmlImported) {
          setImportedHtml(campaign.bodyHtmlImported);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // Best-effort autosave: PATCHes the draft a second after edits settle, so
  // the persisted record keeps up with what's on screen rather than only
  // ever being written at final send. Silent on failure — there's no
  // dedicated resume UI yet to surface a retry into (see campaignId prop
  // doc above), so this is a head start for when one exists, not something
  // the user needs to babysit today. Skips the very first render (nothing
  // has changed yet, and the initial load effect above may still be
  // filling these in).
  const skipFirstRef = useRef(true);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (loading) return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      updateCampaign(
        campaignId,
        source === "visual"
          ? { name, subject, source: "visual", bodyJson: visualBody.json }
          : {
              name,
              subject,
              source: "import",
              bodyHtmlImported: sanitizeHtmlSource(importedHtml),
            },
      ).catch(() => {});
      // Keeps the dashboard's session-local copy (see session-drafts.ts)
      // showing the current name/subject instead of "Untitled campaign"
      // if the user leaves before this draft is ever sent.
      updateSessionDraft(campaignId, { name, subject });
    }, 1000);
    return () => clearTimeout(autosaveRef.current);
  }, [loading, campaignId, name, subject, source, visualBody, importedHtml]);

  // Debounces the simulated recipient recount. No cleanup effect: React 18
  // silently drops a setState from an unmounted component, so a stray
  // timer outliving the composer by up to 500ms is harmless, and this
  // stays a plain ref instead of pulling in an effect just for that.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function recount(next: AudienceFilter[]) {
    clearTimeout(debounceRef.current);
    if (!next.length) {
      setCounting(false);
      setRecipientCount(TOTAL_AUDIENCE);
      return;
    }
    setCounting(true);
    debounceRef.current = setTimeout(() => {
      setCounting(false);
      setRecipientCount(estimateRecipientCount(next));
    }, 500);
  }

  function handleAddFilter() {
    setFilters((prev) => {
      const next = [
        ...prev,
        { id: nextFilterId(), column: "plan", op: "eq", value: "" },
      ];
      recount(next);
      return next;
    });
  }

  function handlePatchFilter(id: string, patch: Partial<AudienceFilter>) {
    setFilters((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      recount(next);
      return next;
    });
  }

  function handleRemoveFilter(id: string) {
    setFilters((prev) => {
      const next = prev.filter((f) => f.id !== id);
      recount(next);
      return next;
    });
  }

  // The imported path is sanitized here too (not just at send) so the
  // preview always reflects what would actually be sent, never the raw
  // typed/pasted text — see sanitize-html-source.ts.
  const previewHtml =
    source === "visual" ? visualBody.html : sanitizeHtmlSource(importedHtml);
  const previewDoc = useMemo(() => wrapEmailShell(previewHtml), [previewHtml]);
  const ready = !!name.trim() && !!subject.trim() && !!previewHtml.trim();

  async function handleSend() {
    if (sendStep || !ready) return;
    setSendError(false);
    setSendStep("saving");
    try {
      // Save whatever's on screen right now — not relying on the debounced
      // autosave above to have already caught up — then confirm. Both
      // calls act on the campaign the button created, never create a new
      // one.
      await updateCampaign(
        campaignId,
        source === "visual"
          ? { name, subject, source: "visual", bodyJson: visualBody.json }
          : // Sanitized again right here, immediately before the request
            // goes out — not just relying on the pass already applied for
            // the live preview above. See sanitize-html-source.ts for why
            // re-sanitizing at each boundary (not just once) is the point,
            // and why the API sanitizing again on receipt is still
            // required regardless — this pass is bypassable by anyone
            // calling the API directly.
            {
              name,
              subject,
              source: "import",
              bodyHtmlImported: sanitizeHtmlSource(importedHtml),
            },
      );
      setSendStep("sending");
      await confirmCampaign(campaignId);
      setSendStep("done");
      // Same reasoning as the autosave effect above — reflect the final
      // name/subject/status in the dashboard's session-local copy so it
      // shows "Sending" (not a stale "Draft") the moment we redirect back.
      updateSessionDraft(campaignId, { name, subject, status: "SENDING" });
      // Hold on "Campaign sent" for a beat before leaving — otherwise the
      // overlay would appear and vanish in the same frame the mocked
      // confirm call resolves.
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      setSendStep(null);
      setSendError(true);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center">
        <Spinner size={20} className="border-[#26262F] border-t-orange" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <CampaignHeader
        name={name}
        onNameChange={setName}
        counting={counting}
        recipientCount={recipientCount}
        sending={sendStep !== null}
        sendError={sendError}
        canSend={ready}
        onSend={handleSend}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 box-border overflow-y-auto px-6 pt-[22px] pb-10 flex flex-col gap-5 border-r border-white/[0.07]">
          <SubjectField value={subject} onChange={setSubject} />

          <div className="flex items-center gap-0.5 bg-black/20 border border-[#26262F] rounded-[7px] p-0.5 self-start">
            {(
              [
                { id: "visual", label: "Compose" },
                { id: "import", label: "Import your own HTML" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSource(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded-[5px] text-[11.5px] font-medium transition-colors cursor-pointer",
                  source === opt.id
                    ? "bg-white/8 text-[#ECECF1]"
                    : "text-[#71717D] hover:text-[#B9B9C2]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {source === "visual" ? (
            <EmailEditor initialHtml={visualBody.html} onChange={setVisualBody} />
          ) : (
            <HtmlImportEditor value={importedHtml} onChange={setImportedHtml} />
          )}

          <div className="h-px bg-white/[0.07]" />
          <AudienceFilters
            filters={filters}
            counting={counting}
            recipientCount={recipientCount}
            onAdd={handleAddFilter}
            onPatch={handlePatchFilter}
            onRemove={handleRemoveFilter}
          />
        </div>

        <PreviewPane
          previewDoc={previewDoc}
          subject={subject}
          recipientCount={recipientCount}
        />
      </div>

      <SendingOverlay step={sendStep} recipientCount={recipientCount} />
    </div>
  );
}
