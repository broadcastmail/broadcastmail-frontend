import {Extension} from "@tiptap/core";
import {Plugin, PluginKey} from "@tiptap/pm/state";
import {Decoration, DecorationSet} from "@tiptap/pm/view";

const TEMPLATE_PATTERN = /\{\{([a-zA-Z_]\w*)\}\}/g;

const VALID_STYLE =
  "background:rgba(240,151,63,0.15);color:#f0973f;border-radius:3px;padding:1px 4px;font-family:monospace;font-size:0.875em;";
const INVALID_STYLE =
  "background:rgba(240,151,63,0.06);color:#71717D;border-radius:3px;padding:1px 4px;font-family:monospace;font-size:0.875em;text-decoration:line-through;";

// Accepts a getter so the caller can hold a ref and update it during render —
// decorations() is called on every transaction, so it always reads the latest value.
export function createTemplateVariableExtension(getValidColumns: () => Set<string>): Extension {
  return Extension.create({
    name: "templateVariableHighlight",

    addProseMirrorPlugin() {
      return new Plugin({
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
                decos.push(
                  Decoration.inline(
                    pos + match.index,
                    pos + match.index + match[0].length,
                    { style: isValid ? VALID_STYLE : INVALID_STYLE },
                  ),
                );
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      });
    },
  });
}
