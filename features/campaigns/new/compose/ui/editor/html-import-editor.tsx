"use client";

import {useMemo, useState} from "react";
import {EditorFooter} from "./editor-footer";
import {EmailWarnings} from "./email-warnings";
import {TipsPanel} from "./tips-panel";
import {detectWarnings, emailSizeBytes} from "@/features/campaigns/new/compose/lib/email-html";
import {sanitizeHtmlSource} from "@/features/campaigns/new/compose/lib/sanitize-html-source";

interface HtmlImportEditorProps {
  value: string;
  onChange: (html: string) => void;
}

// The "bring your own coded email" path — a plain <textarea>, deliberately
// not another schema-parsed surface like email-editor.tsx. The whole point
// of this mode is keeping someone's actual layout (tables, styled divs,
// custom fonts) intact instead of flattening it into the composer's
// blocks, which is exactly what a schema parse would do. That fidelity is
// what makes this path different from pasting into Visual — and also why
// it needs its own trust story instead of the schema's:
//
//   1. Sanitized here (DOMPurify) for the live preview/warnings — UX only,
//      not a security boundary, but it means what's shown already matches
//      what would actually be sent.
//   2. Sanitized again right before send (new-campaign-composer.tsx) —
//      re-running it at the send boundary, not just here, means a
//      DOMPurify update between when this was typed and when it's sent
//      still applies (mutation-XSS fixes land in the library over time;
//      re-sanitizing at each boundary is how you actually benefit from
//      them, the way webmail providers re-sanitize stored mail on render).
//   3. The API must sanitize on receipt too, and that one isn't optional —
//      client-side sanitization is bypassable by anyone calling the API
//      directly, so it's the only pass that's actually a security
//      boundary. That's outside this repo; flagging it here so it isn't
//      quietly assumed to be covered.
export function HtmlImportEditor({ value, onChange }: Readonly<HtmlImportEditorProps>) {
  const [tipsOpen, setTipsOpen] = useState(false);

  // Same DOMPurify pass used before send — running it here too means the
  // preview/warnings reflect what will actually go out, not the raw
  // typed/pasted text (which could still carry something DOMPurify strips).
  const sanitized = useMemo(() => sanitizeHtmlSource(value), [value]);
  const warnings = useMemo(() => detectWarnings(sanitized), [sanitized]);
  const sizeBytes = useMemo(() => emailSizeBytes(sanitized), [sanitized]);
  const wordCount = useMemo(() => {
    const text = sanitized.replace(/<[^<>]*>/g, " ").trim();
    return text ? text.split(/\s+/).length : 0;
  }, [sanitized]);

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex flex-col bg-[#101015] border border-[#26262F] rounded-lg overflow-hidden">
        <div className="px-[14px] py-[14px]">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            aria-label="Email HTML source"
            placeholder="Paste your email's HTML here."
            className="min-h-[288px] w-full resize-y bg-transparent font-mono text-[12.5px] leading-[1.6] text-[#CBCBD4] placeholder:text-[#5C5C66] outline-none"
          />
        </div>
        <EditorFooter
          sizeBytes={sizeBytes}
          wordCount={wordCount}
          tipsOpen={tipsOpen}
          onToggleTips={() => setTipsOpen((v) => !v)}
        />
      </div>

      {tipsOpen && <TipsPanel />}
      <EmailWarnings warnings={warnings} />
    </div>
  );
}
