"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignHeader } from "./campaign-header";
import { SubjectField } from "./subject-field";
import { EmailEditor, type EmailBody } from "./editor/email-editor";
import { HtmlImportEditor } from "./editor/html-import-editor";
import { AudienceFilters } from "./audience-filters";
import { PreviewPane } from "./preview-pane";
import { createCampaign, confirmCampaign } from "@/lib/api/campaigns";
import { wrapEmailShell } from "@/lib/campaigns/email-html";
import { sanitizeHtmlSource } from "@/lib/campaigns/sanitize-html-source";
import { cn } from "@/lib/utils";
import {
  estimateRecipientCount,
  TOTAL_AUDIENCE,
  type AudienceFilter,
} from "@/lib/campaigns/audience";

const SEED_BODY =
  "<p>Hi there,</p>" +
  "<p>We shipped <strong>v2.4</strong> this week — inbound webhooks, faster cold starts, and a rewritten logs view.</p>" +
  '<p><a href="https://example.com/changelog">Read the changelog →</a></p>' +
  "<p>— The team</p>";

type ContentSource = "visual" | "import";

let filterIdSeq = 0;
const nextFilterId = () => `filter-${++filterIdSeq}`;

export function NewCampaignComposer() {
  const router = useRouter();

  const [name, setName] = useState("Campaign #1");
  const [subject, setSubject] = useState(
    "v2.4 is out — webhooks, faster cold starts",
  );

  // The two content sources are kept as fully separate state, not one
  // shared `body` string a mode switch converts between — nothing is lost
  // or reinterpreted when you flip between them, and it keeps "composed
  // through our schema" and "someone's own HTML" from ever blurring into
  // the same value (see editor/email-editor.tsx and
  // editor/html-import-editor.tsx for why that distinction matters).
  const [source, setSource] = useState<ContentSource>("visual");
  const [visualBody, setVisualBody] = useState<EmailBody>({
    html: SEED_BODY,
    json: { type: "doc" },
  });
  const [importedHtml, setImportedHtml] = useState("");

  const [filters, setFilters] = useState<AudienceFilter[]>([]);
  const [counting, setCounting] = useState(false);
  const [recipientCount, setRecipientCount] = useState(TOTAL_AUDIENCE);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

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
    if (sending || !ready) return;
    setSending(true);
    setSendError(false);
    try {
      const campaign = await createCampaign(
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
      await confirmCampaign(campaign.id);
      router.push("/dashboard");
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <CampaignHeader
        name={name}
        onNameChange={setName}
        counting={counting}
        recipientCount={recipientCount}
        sending={sending}
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
            <EmailEditor initialHtml={SEED_BODY} onChange={setVisualBody} />
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
    </div>
  );
}
