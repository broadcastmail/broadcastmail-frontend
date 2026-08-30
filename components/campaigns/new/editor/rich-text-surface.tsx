"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  useEditor,
  EditorContent,
  getMarkRange,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { cn } from "@/lib/utils";
import { EMAIL_EDITOR_EXTENSIONS, EMPTY_DOC } from "@/lib/campaigns/editor-extensions";

export interface RichTextSurfaceHandle {
  /** Insert HTML at the caret (or replace the current selection with it).
   *  Safe regardless of where the string came from — it's parsed against
   *  the editor's schema (see lib/campaigns/editor-extensions.ts), never
   *  assigned to innerHTML directly. */
  insertHtml: (html: string) => void;
  /** Toggle a formatting mark: "bold" | "italic" | "underline" | "removeFormat". */
  exec: (command: string) => void;
  focus: () => void;
  hasSelection: () => boolean;
  getSelectedText: () => string;
  /** The document as ProseMirror JSON — this, not the HTML string, is what
   *  the composer actually stores/sends (see new-campaign-composer.tsx).
   *  It's a snapshot of the same typed schema `onChange`'s HTML is rendered
   *  from, so it carries the same guarantee: nothing in it can be markup
   *  that wasn't produced by this schema. */
  getJson: () => JSONContent;
  /** Kept for API parity with the pre-TipTap version — onChange now fires
   *  on every transaction, so callers no longer need to request a flush. */
  commit: () => void;
  /** href/label of the link or CTA button under `target` (from a click or
   *  right-click), or null if it's neither. */
  getLinkAt: (target: HTMLElement) => { label: string; href: string } | null;
  setLinkAt: (target: HTMLElement, label: string, href: string) => void;
  removeLinkAt: (target: HTMLElement) => void;
  getImageAt: (target: HTMLElement) => { src: string; alt: string; href: string } | null;
  setImageAt: (
    target: HTMLElement,
    value: { src: string; alt: string; href: string | null },
  ) => void;
  removeImageAt: (target: HTMLElement) => void;
}

interface RichTextSurfaceProps {
  initialHtml: string;
  onChange: (html: string) => void;
  onContextMenuTarget?: (target: HTMLElement | null) => void;
  onImageClick?: (target: HTMLImageElement) => void;
  placeholder: string;
  className?: string;
}

// Resolves the CTA button table (if `target` is inside one) or the plain
// text node under `target`, either way as a ProseMirror doc position —
// shared by the link/button get/set/remove handle methods below so they
// only ever mutate the document through a transaction, never the DOM.
function buttonPosAt(editor: Editor, target: HTMLElement) {
  const el = target.closest('table[role="presentation"]');
  if (!el) return null;
  return editor.view.posAtDOM(el, 0);
}

function imagePosAt(editor: Editor, target: HTMLElement) {
  const el = target.closest("img");
  if (!el) return null;
  return editor.view.posAtDOM(el, 0);
}

// A TipTap-backed editing surface. Unlike the old plain contentEditable
// div, content here is never round-tripped through innerHTML/execCommand —
// it's a typed ProseMirror document, and the only way HTML gets in or out
// is through the schema in editor-extensions.ts (in) and editor.getHTML()
// (out). `immediatelyRender: false` avoids the SSR/hydration mismatch
// TipTap warns about under Next.js — the editor mounts client-side only,
// one paint later than the old callback-ref seeding did.
export const RichTextSurface = forwardRef<
  RichTextSurfaceHandle,
  RichTextSurfaceProps
>(function RichTextSurface(
  {
    initialHtml,
    onChange,
    onContextMenuTarget,
    onImageClick,
    placeholder,
    className,
  },
  ref,
) {
  const [isEmpty, setIsEmpty] = useState(!initialHtml.trim());

  const editor = useEditor({
    immediatelyRender: false,
    content: initialHtml,
    extensions: EMAIL_EDITOR_EXTENSIONS,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Email body",
        // Grammarly (and similar extensions) inject their own elements
        // into a contentEditable region on the page — ProseMirror doesn't
        // know about them, so they can corrupt the editor's view of its
        // own DOM (also the source of the SSR/hydration-mismatch warning
        // these extensions cause). These are Grammarly's documented
        // opt-out attributes.
        "data-gramm": "false",
        "data-gramm_editor": "false",
        "data-enable-grammarly": "false",
        class: cn(
          "min-h-[288px] text-[14px] leading-[1.65] text-[#CBCBD4] outline-none",
          "[&_p]:mt-0 [&_p]:mb-3.5 [&_p:last-child]:mb-0",
          "[&_h1]:mt-0 [&_h1]:mb-3 [&_h1]:leading-[1.25] [&_h1]:text-[#ECECF1] [&_h1]:font-semibold",
          "[&_h2]:mt-0 [&_h2]:mb-3 [&_h2]:leading-[1.25] [&_h2]:text-[#ECECF1] [&_h2]:font-semibold",
          "[&_h3]:mt-0 [&_h3]:mb-3 [&_h3]:leading-[1.25] [&_h3]:text-[#ECECF1] [&_h3]:font-semibold",
          "[&_a]:text-orange [&_a]:underline [&_a]:underline-offset-2 [&_a]:cursor-text",
          "[&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[#26262F] [&_hr]:my-5",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:block [&_img]:rounded [&_img]:cursor-pointer [&_img]:outline-offset-2 [&_img:hover]:outline-2 [&_img:hover]:outline [&_img:hover]:outline-orange",
          "[&_table]:cursor-pointer",
          className,
        ),
      },
    },
    // Fires once on mount too (not just on every edit after) — without
    // this, a resumed draft's actual seeded content would never make it
    // into the parent's state until the first keystroke, so submitting
    // (or autosaving) before then would silently send an empty document
    // even though the editor visibly shows the resumed content.
    onCreate: ({ editor }) => onChange(editor.getHTML()),
    onUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty);
      onChange(editor.getHTML());
    },
  });

  // Nothing to sync back — `initialHtml` only ever seeds the editor at
  // creation (see useEditor's `content` above), same "uncontrolled after
  // mount" contract the old callback-ref version documented.
  useEffect(() => () => editor?.destroy(), [editor]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editor?.commands.focus(),
      hasSelection: () => !!editor && !editor.state.selection.empty,
      getSelectedText: () => {
        if (!editor) return "";
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, " ");
      },
      commit: () => {},
      getJson: () => editor?.getJSON() ?? EMPTY_DOC,
      insertHtml: (html) => {
        editor?.chain().focus().insertContent(html).run();
      },
      exec: (command) => {
        if (!editor) return;
        const chain = editor.chain().focus();
        if (command === "bold") chain.toggleBold().run();
        else if (command === "italic") chain.toggleItalic().run();
        else if (command === "underline") chain.toggleUnderline().run();
        else if (command === "removeFormat") chain.unsetAllMarks().run();
      },
      getLinkAt: (target) => {
        if (!editor) return null;
        const buttonPos = buttonPosAt(editor, target);
        if (buttonPos !== null) {
          const node = editor.state.doc.nodeAt(buttonPos);
          if (node?.type.name !== "ctaButton") return null;
          return { label: node.attrs.label, href: node.attrs.href };
        }
        const pos = editor.view.posAtDOM(target, 0);
        const range = getMarkRange(editor.state.doc.resolve(pos), editor.schema.marks.link);
        if (!range) return null;
        return {
          label: editor.state.doc.textBetween(range.from, range.to),
          href: (editor.state.doc.resolve(range.from).marks() ?? [])
            .find((m) => m.type.name === "link")?.attrs.href ?? "",
        };
      },
      setLinkAt: (target, label, href) => {
        if (!editor) return;
        const buttonPos = buttonPosAt(editor, target);
        if (buttonPos !== null) {
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              tr.setNodeMarkup(buttonPos, undefined, { label, href });
              return true;
            })
            .run();
          return;
        }
        const pos = editor.view.posAtDOM(target, 0);
        const range = getMarkRange(editor.state.doc.resolve(pos), editor.schema.marks.link);
        if (!range) return;
        editor
          .chain()
          .focus()
          .insertContentAt(range, {
            type: "text",
            text: label,
            marks: [{ type: "link", attrs: { href } }],
          })
          .run();
      },
      removeLinkAt: (target) => {
        if (!editor) return;
        const buttonPos = buttonPosAt(editor, target);
        if (buttonPos !== null) {
          const node = editor.state.doc.nodeAt(buttonPos);
          if (!node) return;
          editor
            .chain()
            .focus()
            .deleteRange({ from: buttonPos, to: buttonPos + node.nodeSize })
            .run();
          return;
        }
        const pos = editor.view.posAtDOM(target, 0);
        const range = getMarkRange(editor.state.doc.resolve(pos), editor.schema.marks.link);
        if (!range) return;
        editor.chain().focus().setTextSelection(range).unsetLink().run();
      },
      getImageAt: (target) => {
        if (!editor) return null;
        const pos = imagePosAt(editor, target);
        if (pos === null) return null;
        const node = editor.state.doc.nodeAt(pos);
        if (!node || node.type.name !== "image") return null;
        const linkMark = node.marks.find((m) => m.type.name === "link");
        return { src: node.attrs.src, alt: node.attrs.alt, href: linkMark?.attrs.href ?? "" };
      },
      setImageAt: (target, value) => {
        if (!editor) return;
        const pos = imagePosAt(editor, target);
        if (pos === null) return;
        const node = editor.state.doc.nodeAt(pos);
        if (!node) return;
        const from = pos;
        const to = pos + node.nodeSize;
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeMarkup(from, undefined, { src: value.src, alt: value.alt });
            if (value.href) {
              tr.addMark(from, to, editor.schema.marks.link.create({ href: value.href }));
            } else {
              tr.removeMark(from, to, editor.schema.marks.link);
            }
            return true;
          })
          .run();
      },
      removeImageAt: (target) => {
        if (!editor) return;
        const pos = imagePosAt(editor, target);
        if (pos === null) return;
        const node = editor.state.doc.nodeAt(pos);
        if (!node) return;
        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      },
    }),
    [editor],
  );

  return (
    <div className="relative">
      {isEmpty && (
        <div className="pointer-events-none absolute top-0 left-0 text-[13px] leading-[1.65] text-[#5C5C66]">
          {placeholder}
        </div>
      )}
      <div
        onContextMenu={(e) => {
          onContextMenuTarget?.(e.target as HTMLElement);
        }}
        onClickCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target instanceof HTMLImageElement && onImageClick) {
            e.preventDefault();
            onImageClick(target);
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});
