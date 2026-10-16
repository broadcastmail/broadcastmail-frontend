"use client";

import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {linkFieldsSchema, type LinkFieldsValues} from "@/lib/schemas/campaigns";
import {DialogField} from "./dialog-field";

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
}: Readonly<LinkDialogProps>) {
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
          <DialogField
            id="link-dialog-label"
            label={isButton ? "Button text" : "Text"}
            {...register("label")}
            aria-invalid={!!errors.label}
            placeholder={isButton ? "Click here" : "Link text"}
            error={errors.label?.message}
          />
          <DialogField
            id="link-dialog-href"
            label="URL"
            mono
            {...register("href")}
            aria-invalid={!!errors.href}
            placeholder="https://example.com"
            error={errors.href?.message}
          />
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
