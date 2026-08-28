// The TipTap schema that replaces the old contentEditable + innerHTML /
// execCommand("insertHTML") approach. Untrusted markup (paste, drag-drop,
// a saved draft loaded from the API) never gets assigned to innerHTML as a
// string — TipTap's HTML parser walks it against these node/mark
// definitions, and anything that doesn't match a `parseHTML` rule here
// (a <script>, an `onerror` attribute, a `javascript:` href) has nowhere
// to go: it's either dropped or its text content survives as inert text,
// never as markup. See rich-text-surface.tsx for where this schema is
// wired into the editor.

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Node, mergeAttributes } from "@tiptap/core";
import { sanitizeUrl } from "@/lib/campaigns/email-html";

// Same http(s)-only allowlist the rest of the composer already uses
// (dialogs, snippets) — applied here too so a pasted `javascript:`/`data:`
// href never becomes a real link/image src no matter which path it
// arrives through.
export const EmailLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      href: {
        default: null,
        parseHTML: (element) => sanitizeUrl(element.getAttribute("href") ?? ""),
      },
    };
  },
}).configure({
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
  isAllowedUri: (url) => !!sanitizeUrl(url),
});

// Extends the stock Image node instead of hand-rolling one: `parseHTML`'s
// `getAttrs` only ever reads `src`/`alt` off the matched element (and
// rejects the match entirely if `src` isn't a safe http(s) URL) — any
// other attribute a pasted <img> carries (onerror, onload, style, …)
// simply never makes it into the node's attrs, so it can't be rendered
// back out either. Mirrors the fixed sizing imageSnippetHtml used to hard-code.
export const EmailImage = Image.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) => {
          const src = sanitizeUrl((element as HTMLElement).getAttribute("src") ?? "");
          if (!src) return false;
          return { src, alt: (element as HTMLElement).getAttribute("alt") ?? "" };
        },
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "img",
      mergeAttributes({
        src: node.attrs.src,
        alt: node.attrs.alt,
        width: "552",
        style: "max-width:100%;height:auto;display:block;",
      }),
    ];
  },
}).configure({ inline: true });

// The Outlook-safe CTA button (bgcolor'd <td> + <a>, no <button>/flex) is
// kept as one atomic node with {label, href} attrs, not raw table markup a
// user could hand-edit into arbitrary HTML. `parseHTML` recognizes the
// exact shape buttonSnippetHtml() produces (or an equivalent pasted one)
// and reduces it back to those two attrs — nothing from the matched
// element's markup survives except the label text and a re-validated href.
export const CtaButton = Node.create({
  name: "ctaButton",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      label: { default: "Click here" },
      href: { default: "#" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'table[role="presentation"]',
        getAttrs: (element) => {
          const anchor = (element as HTMLElement).querySelector("a[href]");
          if (!anchor) return false;
          const href = sanitizeUrl(anchor.getAttribute("href") ?? "");
          if (!href) return false;
          return { label: anchor.textContent?.trim() || "Click here", href };
        },
      },
    ];
  },

  renderHTML({ node }) {
    // The label is handed to ProseMirror's DOMOutputSpec as a plain string
    // child, which becomes a real text node (createTextNode), not markup —
    // escaping it here would double-escape once getHTML() serializes it.
    const href = sanitizeUrl(node.attrs.href) ?? "#";
    return [
      "table",
      { role: "presentation", cellpadding: "0", cellspacing: "0", border: "0" },
      [
        "tr",
        {},
        [
          "td",
          { bgcolor: "#18181B", style: "border-radius:6px;" },
          [
            "a",
            {
              href,
              style:
                "display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;",
            },
            node.attrs.label,
          ],
        ],
      ],
    ];
  },
});
