"use client";

import {useMemo, useRef, useState} from "react";
import type {JSONContent} from "@tiptap/core";
import {Bold, Eraser, ImageIcon, Italic, Link2, Minus, Underline as UnderlineIcon, Unlink,} from "lucide-react";

import {ContextMenu, ContextMenuContent, ContextMenuSeparator, ContextMenuTrigger,} from "@/components/ui/context-menu";
import {QuickActionItem} from "./quick-action-item";
import {RichTextSurface, type RichTextSurfaceHandle} from "./rich-text-surface";
import {EMPTY_DOC} from "@/features/campaigns/new/compose/lib/editor-extensions";
import {EditorToolbar} from "./editor-toolbar";
import {EditorFooter} from "./editor-footer";
import {EmailWarnings} from "./email-warnings";
import {TipsPanel} from "./tips-panel";
import {LinkDialog} from "./link-dialog";
import {ImageDialog, type ImageDialogValue} from "./image-dialog";
import {
    buttonSnippetHtml,
    EDITOR_SNIPPETS,
    type EditorSnippet,
    imageSnippetHtml,
    linkSnippetHtml,
} from "@/features/campaigns/new/compose/lib/snippets";
import {detectWarnings, emailSizeBytes, sanitizeUrl} from "@/features/campaigns/new/compose/lib/email-html";

export interface EmailBody {
  html: string;
  /** The document as ProseMirror JSON — this, not `html`, is what actually
   *  gets stored/sent (see new-campaign-composer.tsx). `html` is kept
   *  alongside it only for the live preview iframe and the word-count/size
   *  warnings below, both of which just need a string to work with. */
  json: JSONContent;
}

interface EmailEditorProps {
  initialHtml: string;
  onChange: (body: EmailBody) => void;
}

interface LinkDialogState {
  open: boolean;
  variant: "link" | "button";
  initialLabel: string;
  /** Bumped on every open so the dialog remounts with fresh defaultValues
   *  instead of syncing `initialLabel` back in via an effect. */
  nonce: number;
}

interface ImageDialogState {
  open: boolean;
  mode: "insert" | "edit";
  initialValue?: ImageDialogValue;
  nonce: number;
}

// Orchestrates the WYSIWYG surface: the snippet toolbar, the right-click
// quick-actions menu, and the link/image dialogs all funnel through the
// same RichTextSurface ref so caret/selection state stays consistent no
// matter which entry point triggered the edit. Editing an existing
// link/button/image no longer mutates the DOM directly (that would fight
// TipTap's own re-render of the document) — it goes through the ref's
// get/set/removeAt methods, which apply a ProseMirror transaction instead.
export function EmailEditor({ initialHtml, onChange }: Readonly<EmailEditorProps>) {
  const surfaceRef = useRef<RichTextSurfaceHandle>(null);
  const [bodyHtml, setBodyHtml] = useState(initialHtml);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [contextTarget, setContextTarget] = useState<HTMLElement | null>(null);

  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    open: false,
    variant: "link",
    initialLabel: "",
    nonce: 0,
  });
  const [imageDialog, setImageDialog] = useState<ImageDialogState>({
    open: false,
    mode: "insert",
    nonce: 0,
  });
  // The DOM element a dialog is editing, if any — only ever used as a key
  // to look up the underlying doc node/mark via the surface ref, never
  // mutated directly. Kept in a ref since reassigning it never needs to
  // trigger a re-render.
  const editingLinkRef = useRef<HTMLElement | null>(null);
  const editingImgRef = useRef<HTMLImageElement | null>(null);

  const warnings = useMemo(() => detectWarnings(bodyHtml), [bodyHtml]);
  const sizeBytes = useMemo(() => emailSizeBytes(bodyHtml), [bodyHtml]);
  const wordCount = useMemo(() => {
    const text = bodyHtml.replace(/<[^<>]*>/g, " ").trim();
    return text ? text.split(/\s+/).length : 0;
  }, [bodyHtml]);

  function handleBodyChange(html: string) {
    setBodyHtml(html);
    onChange({ html, json: surfaceRef.current?.getJson() ?? EMPTY_DOC });
  }

  function openInsertLink() {
    editingLinkRef.current = null;
    setLinkDialog((s) => ({
      open: true,
      variant: "link",
      initialLabel: surfaceRef.current?.getSelectedText() ?? "",
      nonce: s.nonce + 1,
    }));
  }

  function openInsertButton() {
    editingLinkRef.current = null;
    setLinkDialog((s) => ({
      open: true,
      variant: "button",
      initialLabel: "",
      nonce: s.nonce + 1,
    }));
  }

  function openEditLink(target: HTMLElement) {
    editingLinkRef.current = target;
    setLinkDialog((s) => ({
      open: true,
      variant: "link",
      initialLabel: target.textContent?.trim() ?? "",
      nonce: s.nonce + 1,
    }));
  }

  function handleLinkSubmit(label: string, href: string) {
    // `href` already passed the dialog's zod validation (http(s)-only),
    // but re-sanitize here too — never trust a value crossing a component
    // boundary, only what we check right here. (EmailLink's own
    // isAllowedUri check in editor-extensions.ts is the actual last line
    // of defense either way.)
    const safeHref = sanitizeUrl(href);
    if (!safeHref) return;

    const editingLink = editingLinkRef.current;
    if (editingLink) {
      surfaceRef.current?.setLinkAt(editingLink, label, safeHref);
      return;
    }
    const html =
      linkDialog.variant === "button"
        ? buttonSnippetHtml(label, safeHref)
        : linkSnippetHtml(label, safeHref);
    surfaceRef.current?.insertHtml(html);
  }

  function openInsertImage() {
    editingImgRef.current = null;
    setImageDialog((s) => ({ open: true, mode: "insert", nonce: s.nonce + 1 }));
  }

  function openEditImage(img: HTMLImageElement) {
    const anchor = img.closest("a");
    editingImgRef.current = img;
    setImageDialog((s) => ({
      open: true,
      mode: "edit",
      initialValue: { src: img.src, alt: img.alt, href: anchor?.href ?? "" },
      nonce: s.nonce + 1,
    }));
  }

  function handleImageSubmit(value: ImageDialogValue) {
    // Re-sanitize both URLs here too — same reasoning as handleLinkSubmit.
    const safeSrc = sanitizeUrl(value.src);
    if (!safeSrc) return;
    const safeHref = value.href ? sanitizeUrl(value.href) : null;

    const img = editingImgRef.current;
    if (!img) {
      surfaceRef.current?.insertHtml(
        imageSnippetHtml(safeSrc, value.alt, safeHref ?? undefined),
      );
      return;
    }

    surfaceRef.current?.setImageAt(img, { src: safeSrc, alt: value.alt, href: safeHref });
  }

  function handleImageRemove() {
    if (editingImgRef.current) surfaceRef.current?.removeImageAt(editingImgRef.current);
  }

  function handleSnippetPick(snippet: EditorSnippet) {
    switch (snippet.kind) {
      case "link":
        openInsertLink();
        return;
      case "button":
        openInsertButton();
        return;
      case "image":
        openInsertImage();
        return;
      case "insert":
        if (snippet.template) {
          surfaceRef.current?.insertHtml(
            snippet.template(surfaceRef.current?.getSelectedText() ?? ""),
          );
        }
    }
  }

  const imgTarget = contextTarget?.closest("img") as HTMLImageElement | null;
  // A CTA button is an <a> inside the button's table markup — check for the
  // table first (covers a right-click that lands on the table/td padding
  // rather than the anchor text itself) and fall back to a plain <a>.
  const anchorTarget = !imgTarget
    ? ((contextTarget?.closest('table[role="presentation"]') ??
        contextTarget?.closest("a")) as HTMLElement | null)
    : null;

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex flex-col bg-[#101015] border border-[#26262F] rounded-lg overflow-hidden">
        <EditorToolbar snippets={EDITOR_SNIPPETS} onPick={handleSnippetPick} />

        <ContextMenu
          onOpenChange={(open) => {
            if (!open) setContextTarget(null);
          }}
        >
          <ContextMenuTrigger asChild>
            <div className="px-[14px] py-[14px]">
              <RichTextSurface
                ref={surfaceRef}
                initialHtml={initialHtml}
                onChange={handleBodyChange}
                onContextMenuTarget={setContextTarget}
                onImageClick={openEditImage}
                placeholder="Write your email — or start with a block above."
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="flex flex-row items-center gap-0.5 min-w-0 p-1">
            {imgTarget && (
              <>
                <QuickActionItem
                  icon={<ImageIcon />}
                  label="Edit image"
                  onSelect={() => openEditImage(imgTarget)}
                />
                <QuickActionItem
                  icon={<Eraser />}
                  label="Remove image"
                  variant="destructive"
                  onSelect={() => surfaceRef.current?.removeImageAt(imgTarget)}
                />
              </>
            )}
            {!imgTarget && anchorTarget && (
              <>
                <QuickActionItem
                  icon={<Link2 />}
                  label="Edit link"
                  onSelect={() => openEditLink(anchorTarget)}
                />
                <QuickActionItem
                  icon={<Unlink />}
                  label="Remove link"
                  variant="destructive"
                  onSelect={() => surfaceRef.current?.removeLinkAt(anchorTarget)}
                />
              </>
            )}
            {!imgTarget && !anchorTarget && (
              <>
                <QuickActionItem
                  icon={<Bold />}
                  label="Bold"
                  onSelect={() => surfaceRef.current?.exec("bold")}
                />
                <QuickActionItem
                  icon={<Italic />}
                  label="Italic"
                  onSelect={() => surfaceRef.current?.exec("italic")}
                />
                <QuickActionItem
                  icon={<UnderlineIcon />}
                  label="Underline"
                  onSelect={() => surfaceRef.current?.exec("underline")}
                />
                <ContextMenuSeparator className="w-px h-5 mx-0.5 my-0" />
                <QuickActionItem icon={<Link2 />} label="Insert link" onSelect={openInsertLink} />
                <QuickActionItem
                  icon={<ImageIcon />}
                  label="Insert image"
                  onSelect={openInsertImage}
                />
                <QuickActionItem
                  icon={<Minus />}
                  label="Insert divider"
                  onSelect={() =>
                    surfaceRef.current?.insertHtml(
                      '<hr style="border:0;border-top:1px solid #E4E4E7;margin:24px 0;">',
                    )
                  }
                />
                <ContextMenuSeparator className="w-px h-5 mx-0.5 my-0" />
                <QuickActionItem
                  icon={<Eraser />}
                  label="Clear formatting"
                  onSelect={() => surfaceRef.current?.exec("removeFormat")}
                />
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>

        <EditorFooter
          sizeBytes={sizeBytes}
          wordCount={wordCount}
          tipsOpen={tipsOpen}
          onToggleTips={() => setTipsOpen((v) => !v)}
        />
      </div>

      {tipsOpen && <TipsPanel />}
      <EmailWarnings warnings={warnings} />

      <LinkDialog
        key={`link-${linkDialog.nonce}`}
        open={linkDialog.open}
        variant={linkDialog.variant}
        initialLabel={linkDialog.initialLabel}
        onOpenChange={(open) => setLinkDialog((s) => ({ ...s, open }))}
        onSubmit={handleLinkSubmit}
      />
      <ImageDialog
        key={`image-${imageDialog.nonce}`}
        open={imageDialog.open}
        mode={imageDialog.mode}
        initialValue={imageDialog.initialValue}
        onOpenChange={(open) => setImageDialog((s) => ({ ...s, open }))}
        onSubmit={handleImageSubmit}
        onRemove={imageDialog.mode === "edit" ? handleImageRemove : undefined}
      />
    </div>
  );
}
