import DOMPurify from "dompurify";

// The client-side sanitization pass for imported HTML (see
// html-import-editor.tsx) — run on every render there for live
// preview/warnings, and again right before send
// (new-campaign-composer.tsx's handleSend). Content typed or pasted into
// the import view is never routed through the visual editor's schema
// (editor-extensions.ts) — that's the point of the mode, it keeps a
// hand-built layout intact instead of flattening it — so unlike the
// visual surface, nothing here structurally prevents a <script> from being
// typed in. DOMPurify is the actual gate on this path, same
// http(s)/mailto/tel allowlist the rest of the composer already applies to
// links and images.
//
// This is a UX-safety pass, not the security boundary: it's bypassable by
// anyone calling the API directly instead of going through this UI. The
// API MUST run an equivalent sanitizer on receipt — that's the pass that
// actually matters, since this is what a real inbox ends up rendering with
// no sandbox at all. Re-running it at each boundary (here, before send,
// and on the API's receipt) rather than once is deliberate: DOMPurify gets
// patched for newly-discovered bypasses over time, and only re-sanitizing
// on each pass means already-composed content benefits from those fixes
// too — the same reason webmail providers re-sanitize stored mail at
// render time instead of only once when it arrives.
export function sanitizeHtmlSource(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#)/i,
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "textarea",
      "select",
    ],
    FORBID_ATTR: ["srcdoc"],
  });
}
