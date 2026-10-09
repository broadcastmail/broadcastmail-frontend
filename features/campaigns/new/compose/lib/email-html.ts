// Shared between the live preview iframe and the size/warning checks run
// on every edit — kept framework-free so it can run in either place
// without dragging in DOM-only APIs beyond what both share (string ops).

export const GMAIL_CLIP_BYTES = 102 * 1024;

export const EMPTY_BODY_PLACEHOLDER =
  '<p style="color:#D4D4D8;font-style:italic;">Your email body will appear here.</p>';

export function wrapEmailShell(bodyHtml: string): string {
  const body = bodyHtml.trim() ? bodyHtml : EMPTY_BODY_PLACEHOLDER;
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    "html,body{margin:0;padding:0;background:#fff;}" +
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;' +
    "font-size:15px;line-height:1.6;color:#18181B;padding:28px 24px 20px;}" +
    "p{margin:0 0 14px;} a{color:#2563EB;} img{max-width:100%;}" +
    "h1,h2,h3{line-height:1.25;margin:0 0 12px;}" +
    ".bm-unsub{margin-top:28px;padding-top:16px;border-top:1px solid #E4E4E7;" +
    "font-size:11.5px;color:#A1A1AA;text-align:center;}" +
    ".bm-unsub a{color:#A1A1AA;text-decoration:underline;}" +
    "</style></head><body>" +
    body +
    '<div class="bm-unsub">You are receiving this because you have an account with us.<br>' +
    '<a href="#">Unsubscribe</a></div></body></html>'
  );
}

export function emailSizeBytes(bodyHtml: string): number {
  return new TextEncoder().encode(bodyHtml).length;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export interface EmailWarning {
  id: string;
  text: string;
}
export function detectWarnings(bodyHtml: string): EmailWarning[] {
  const warnings: EmailWarning[] = [];

  if (/<img(?![^>]*\balt=)/i.test(bodyHtml)) {
    warnings.push({
      id: "missing-alt",
      text: "An image is missing alt text — blocked-image clients will show nothing.",
    });
  }
  if (/display\s*:\s*(flex|grid)/i.test(bodyHtml)) {
    warnings.push({
      id: "flex-grid",
      text: "flex / grid detected — Outlook ignores both. Use a table for that layout.",
    });
  }
  if (emailSizeBytes(bodyHtml) > GMAIL_CLIP_BYTES) {
    warnings.push({
      id: "oversized",
      text: "Over 102 KB — Gmail will clip this email and hide the unsubscribe link.",
    });
  }
  if (!/<a\s/i.test(bodyHtml) && bodyHtml.trim()) {
    warnings.push({
      id: "no-links",
      text: "No links yet — an email without a call to action rarely converts.",
    });
  }

  return warnings;
}
