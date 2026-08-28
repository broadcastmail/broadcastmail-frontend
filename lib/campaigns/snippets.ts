// Toolbar / quick-action blocks insertable into the email body. "link",
// "button" and "image" are handled by a dialog instead of a plain
// insert — they all need a URL, and typing "https://" into raw markup by
// hand is exactly the raw-HTML experience the rich editor replaces.

import { escapeHtml, sanitizeUrl } from "@/lib/campaigns/email-html";

export type SnippetKind = "insert" | "link" | "button" | "image";
export type SnippetIcon =
  | "paragraph"
  | "heading"
  | "link"
  | "button"
  | "image"
  | "divider"
  | "merge";

export interface EditorSnippet {
  id: string;
  label: string;
  hint: string;
  icon: SnippetIcon;
  kind: SnippetKind;
  template?: (selection: string) => string;
}

export const EDITOR_SNIPPETS: EditorSnippet[] = [
  {
    id: "paragraph",
    label: "Paragraph",
    hint: "A block of body text",
    icon: "paragraph",
    kind: "insert",
    template: (sel) => `<p>${escapeHtml(sel) || "Your text"}</p>`,
  },
  {
    id: "heading",
    label: "Heading",
    hint: "Section heading",
    icon: "heading",
    kind: "insert",
    template: (sel) => `<h2>${escapeHtml(sel) || "Your heading"}</h2>`,
  },
  {
    id: "link",
    label: "Link",
    hint: "Inline text link",
    icon: "link",
    kind: "link",
  },
  {
    id: "button",
    label: "Button",
    hint: "Call-to-action button — built to render in Outlook",
    icon: "button",
    kind: "button",
  },
  {
    id: "image",
    label: "Image",
    hint: "Image with alt text and mobile-safe width",
    icon: "image",
    kind: "image",
  },
  {
    id: "divider",
    label: "Divider",
    hint: "Horizontal rule between sections",
    icon: "divider",
    kind: "insert",
    template: () =>
      '<hr style="border:0;border-top:1px solid #E4E4E7;margin:24px 0;">',
  },
  {
    id: "merge",
    label: "First name",
    hint: 'Personalisation — falls back to "there" when unknown',
    icon: "merge",
    kind: "insert",
    template: () => "{{first_name}}",
  },
];

// label/alt are escaped and href is re-validated at the point of
// interpolation (belt-and-braces on top of the zod schema the dialogs
// already run values through) — nothing here trusts its caller.

// Renders the CTA table markup Outlook actually respects (no <button>,
// no flex — a bgcolor'd <td> is the one button style every client agrees
// to paint).
export function buttonSnippetHtml(label: string, href: string): string {
  const safeHref = sanitizeUrl(href) ?? "#";
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td bgcolor="#18181B" style="border-radius:6px;">' +
    `<a href="${safeHref}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a>` +
    "</td></tr></table>"
  );
}

export function linkSnippetHtml(label: string, href: string): string {
  const safeHref = sanitizeUrl(href) ?? "#";
  return `<a href="${safeHref}">${escapeHtml(label)}</a>`;
}

export function imageSnippetHtml(src: string, alt: string, href?: string): string {
  const safeSrc = sanitizeUrl(src) ?? "";
  const img = `<img src="${safeSrc}" alt="${escapeHtml(alt)}" width="552" style="max-width:100%;height:auto;display:block;">`;
  if (!href) return img;
  const safeHref = sanitizeUrl(href) ?? "#";
  return `<a href="${safeHref}">${img}</a>`;
}
