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
import { imageFieldsSchema, type ImageFieldsValues } from "@/lib/schemas/campaigns";

export type ImageDialogValue = ImageFieldsValues;

interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "insert" | "edit";
  initialValue?: ImageDialogValue;
  onSubmit: (value: ImageDialogValue) => void;
  onRemove?: () => void;
}

// Covers both inserting a new image and editing one already in the body
// (click any image in the editor to reopen this pre-filled) — src, alt
// text, and an optional link the image itself opens. Like LinkDialog, the
// parent remounts this via a `key` bumped per open instead of an effect.
export function ImageDialog({
  open,
  onOpenChange,
  mode,
  initialValue,
  onSubmit,
  onRemove,
}: ImageDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ImageFieldsValues>({
    resolver: zodResolver(imageFieldsSchema),
    mode: "onBlur",
    defaultValues: {
      src: initialValue?.src ?? "",
      alt: initialValue?.alt ?? "",
      href: initialValue?.href ?? "",
    },
  });

  function submit(values: ImageFieldsValues) {
    onSubmit(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit image" : "Insert image"}</DialogTitle>
          <DialogDescription>
            Mobile-safe width, and alt text so blocked-image clients still
            show something.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="image-dialog-src" className="text-xs font-medium text-[#8E8E9A]">
              Image URL
            </label>
            <input
              id="image-dialog-src"
              {...register("src")}
              placeholder="https://example.com/image.png"
              autoFocus
              aria-invalid={!!errors.src}
              className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 font-mono text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none aria-invalid:border-[#E5726A]"
            />
            {errors.src && <p className="text-xs text-[#E5726A]">{errors.src.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="image-dialog-alt" className="text-xs font-medium text-[#8E8E9A]">
              Alt text
            </label>
            <input
              id="image-dialog-alt"
              {...register("alt")}
              placeholder="Describes the image"
              aria-invalid={!!errors.alt}
              className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none aria-invalid:border-[#E5726A]"
            />
            {errors.alt && <p className="text-xs text-[#E5726A]">{errors.alt.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="image-dialog-href" className="text-xs font-medium text-[#8E8E9A]">
              Link to <span className="text-[#5C5C66]">(optional)</span>
            </label>
            <input
              id="image-dialog-href"
              {...register("href")}
              placeholder="https://example.com"
              aria-invalid={!!errors.href}
              className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 font-mono text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none aria-invalid:border-[#E5726A]"
            />
            {errors.href && <p className="text-xs text-[#E5726A]">{errors.href.message}</p>}
          </div>
          <DialogFooter className={mode === "edit" ? "justify-between" : undefined}>
            {mode === "edit" && onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  onOpenChange(false);
                }}
                className="mr-auto rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#E5726A] hover:bg-[#E5726A]/10 transition-colors cursor-pointer"
              >
                Remove image
              </button>
            )}
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
              {mode === "edit" ? "Save" : "Insert image"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
