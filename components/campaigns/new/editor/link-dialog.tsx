"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { linkFieldsSchema, type LinkFieldsValues } from "@/lib/schemas/campaigns";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "link" | "button";
  initialLabel?: string;
  onSubmit: (label: string, href: string) => void;
}

// Backs both the "Link" and "Button" snippets — a button is really just a
// styled anchor, so it needs the same two fields (visible text + URL).
// The parent remounts this component (via a `key` bumped on every open)
// instead of us syncing `initialLabel` in an effect — defaultValues only
// need to be read once per mount for that to reset correctly.
export function LinkDialog({
  open,
  onOpenChange,
  variant,
  initialLabel,
  onSubmit,
}: LinkDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LinkFieldsValues>({
    resolver: zodResolver(linkFieldsSchema),
    mode: "onBlur",
    defaultValues: { label: initialLabel ?? "", href: "" },
  });

  const isButton = variant === "button";

  function submit(values: LinkFieldsValues) {
    onSubmit(values.label || (isButton ? "Click here" : values.href), values.href);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isButton ? "Insert button" : "Insert link"}</DialogTitle>
          <DialogDescription>
            {isButton
              ? "A call-to-action button, built to render in Outlook."
              : "Adds a link at your cursor, or around the selected text."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="link-dialog-label" className="text-xs font-medium text-[#8E8E9A]">
              {isButton ? "Button text" : "Text"}
            </label>
            <input
              id="link-dialog-label"
              {...register("label")}
              placeholder={isButton ? "Click here" : "Link text"}
              aria-invalid={!!errors.label}
              className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none aria-invalid:border-[#E5726A]"
            />
            {errors.label && (
              <p className="text-xs text-[#E5726A]">{errors.label.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="link-dialog-href" className="text-xs font-medium text-[#8E8E9A]">
              URL
            </label>
            <input
              id="link-dialog-href"
              {...register("href")}
              placeholder="https://example.com"
              autoFocus
              aria-invalid={!!errors.href}
              className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 font-mono text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none aria-invalid:border-[#E5726A]"
            />
            {errors.href && (
              <p className="text-xs text-[#E5726A]">{errors.href.message}</p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#8E8E9A] hover:text-[#ECECF1] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-orange hover:bg-orange-hover px-3.5 py-2.5 text-[13px] font-semibold text-[#120C06] transition-colors cursor-pointer"
            >
              {isButton ? "Insert button" : "Insert link"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
