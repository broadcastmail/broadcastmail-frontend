import {sanitizeUrl} from "@/features/campaigns/new/compose/lib/email-html";

const SIMPLE_TAGS = ["strong", "b", "em", "i", "u"];
const HEADING_TAGS = ["h1", "h2", "h3"];

// Converts a handful of typed HTML tags into the same real formatting the
export function applyInlineShorthand(root: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel?.isCollapsed) return;
  const node = sel.anchorNode;
  if (node?.nodeType !== Node.TEXT_NODE || !root.contains(node)) return;

  const text = node.textContent ?? "";
  const offset = sel.anchorOffset;
  const before = text.slice(0, offset);

  const hr = /<hr\s*\/?>$/i.exec(before);
  if (hr) {
    replaceWithElement(node, offset - hr[0].length, offset, document.createElement("hr"));
    return;
  }

  const headingPattern = new RegExp(
      String.raw`<(${HEADING_TAGS.join("|")})>([^<]*)</\1>$`,
    "i",
  );
  const heading = headingPattern.exec(before);
  if (heading) {
    const el = document.createElement(heading[1].toLowerCase());
    el.textContent = heading[2];
    replaceWithElement(node, offset - heading[0].length, offset, el);
    return;
  }

  const link = /<a\s+href=["']([^"']*)["']\s*>([^<]*)<\/a>$/i.exec(before);
  if (link) {
    const href = sanitizeUrl(link[1]);
    if (href) {
      const el = document.createElement("a");
      el.href = href;
      el.textContent = link[2];
      replaceWithElement(node, offset - link[0].length, offset, el);
      return;
    }
  }

  const inlinePattern = new RegExp(String.raw`<(${SIMPLE_TAGS.join("|")})>([^<]*)</\1>$`, "i");
  const inline = inlinePattern.exec(before);
  if (inline) {
    const el = document.createElement(inline[1].toLowerCase());
    el.textContent = inline[2];
    replaceWithElement(node, offset - inline[0].length, offset, el);
  }
}

// Splices [start, end) out of a text node and drops `el` in its place,
// then parks the caret immediately after it — mirrors where typing the
// closing character would otherwise have just left it.
function replaceWithElement(node: Node, start: number, end: number, el: HTMLElement) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  range.deleteContents();
  range.insertNode(el);

  const sel = window.getSelection();
  if (!sel) return;
  const after = document.createRange();
  after.setStartAfter(el);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}
