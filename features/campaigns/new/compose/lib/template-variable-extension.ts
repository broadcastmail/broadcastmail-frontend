import {Extension} from "@tiptap/core";
import {Plugin, PluginKey} from "@tiptap/pm/state";
import {Decoration, DecorationSet} from "@tiptap/pm/view";

const TEMPLATE_PATTERN = /\{\{([a-zA-Z_]\w*)\}\}/g;

const VALID_STYLE =
  "background:rgba(240,151,63,0.15);color:#f0973f;border-radius:3px;padding:1px 4px;font-family:monospace;font-size:0.875em;";
const INVALID_STYLE =
  "background:rgba(240,151,63,0.06);color:#71717D;border-radius:3px;padding:1px 4px;font-family:monospace;font-size:0.875em;text-decoration:line-through;";

function makeWarningWidget(colName: string): HTMLElement {
  const el = document.createElement("span");
  el.setAttribute("title", `"${colName}" isn't a specified column`);
  el.style.cssText =
    "display:inline-flex;align-items:center;margin-left:2px;vertical-align:middle;cursor:default;color:#71717D;";
  el.innerHTML =
    '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M8.22 2.09a.25.25 0 0 0-.44 0L1.17 13.5a.25.25 0 0 0 .22.37h13.22a.25.25 0 0 0 .22-.37L8.22 2.09ZM6.92.96a1.75 1.75 0 0 1 3.06 0l6.63 11.41A1.75 1.75 0 0 1 15.08 15H.92a1.75 1.75 0 0 1-1.53-2.63L6.02.96Z" fill="currentColor"/>' +
    '<path d="M9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM8 5.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5.5Z" fill="currentColor"/>' +
    "</svg>";
  return el;
}

// Accepts a getter so the caller can hold a ref and update it during render —
// decorations() is called on every transaction, so it always reads the latest value.
export function createTemplateVariableExtension(getValidColumns: () => Set<string>): Extension {
  return Extension.create({
    name: "templateVariableHighlight",

    addProseMirrorPlugins() {
      return [new Plugin({
        key: new PluginKey("templateVariableHighlight"),
        props: {
          decorations(state) {
            const validColumns = getValidColumns();
            const decos: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              let match: RegExpExecArray | null;
              TEMPLATE_PATTERN.lastIndex = 0;
              while ((match = TEMPLATE_PATTERN.exec(node.text)) !== null) {
                const colName = match[1];
                const isValid = validColumns.size === 0 || validColumns.has(colName);
                const end = pos + match.index + match[0].length;
                decos.push(
                  Decoration.inline(
                    pos + match.index,
                    end,
                    { style: isValid ? VALID_STYLE : INVALID_STYLE },
                  ),
                );
                if (!isValid) {
                  decos.push(
                    Decoration.widget(end, () => makeWarningWidget(colName), { side: 1 }),
                  );
                }
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      })];
    },
  });
}
