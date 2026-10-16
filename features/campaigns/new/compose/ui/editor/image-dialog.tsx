"use client";

import type {FieldErrors, UseFormRegister} from "react-hook-form";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {imageFieldsSchema, type ImageFieldsValues} from "@/lib/schemas/campaigns";
import {DialogField} from "./dialog-field";

export type ImageDialogValue = ImageFieldsValues;

function useImageForm(initialValue?: ImageDialogValue) {
  return useForm<ImageFieldsValues>({
    resolver: zodResolver(imageFieldsSchema),
    mode: "onBlur",
    defaultValues: {
      src: initialValue?.src ?? "",
      alt: initialValue?.alt ?? "",
      href: initialValue?.href ?? "",
    },
  });
}

function ImageFormFields({
  register,
  errors,
}: {
  register: UseFormRegister<ImageFieldsValues>;
  errors: FieldErrors<ImageFieldsValues>;
}) {
  return (
    <>
      <DialogField
        id="image-dialog-src"
        label="Image URL"
        mono
        {...register("src")}
        aria-invalid={!!errors.src}
        placeholder="https://example.com/image.png"
        error={errors.src?.message}
      />
      <DialogField
        id="image-dialog-alt"
        label="Alt text"
        {...register("alt")}
        aria-invalid={!!errors.alt}
        placeholder="Describes the image"
        error={errors.alt?.message}
      />
      <DialogField
        id="image-dialog-href"
        label={<>Link to <span className="text-[#5C5C66]">(optional)</span></>}
        mono
        {...register("href")}
        aria-invalid={!!errors.href}
        placeholder="https://example.com"
        error={errors.href?.message}
      />
    </>
  );
}

// Parent remounts both dialogs via a `key` bumped per open instead of syncing
// initialValue back via an effect — defaultValues only need to be read once.

export function InsertImageDialog({
  open,
  onOpenChange,
  onSubmit,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: ImageDialogValue) => void;
}>) {
  const {register, handleSubmit, formState: {errors}} = useImageForm();

  function submit(values: ImageFieldsValues) {
    onSubmit(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>
            Mobile-safe width, and alt text so blocked-image clients still show something.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" noValidate>
          <ImageFormFields register={register} errors={errors} />
          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)}
              className="rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#8E8E9A] hover:text-[#ECECF1] transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-orange hover:bg-orange-hover px-3.5 py-2.5 text-[13px] font-semibold text-[#120C06] transition-colors cursor-pointer">
              Insert image
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditImageDialog({
  open,
  onOpenChange,
  initialValue,
  onSubmit,
  onRemove,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: ImageDialogValue;
  onSubmit: (value: ImageDialogValue) => void;
  onRemove: () => void;
}>) {
  const {register, handleSubmit, formState: {errors}} = useImageForm(initialValue);

  function submit(values: ImageFieldsValues) {
    onSubmit(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
          <DialogDescription>
            Mobile-safe width, and alt text so blocked-image clients still show something.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" noValidate>
          <ImageFormFields register={register} errors={errors} />
          <DialogFooter className="justify-between">
            <button type="button"
              onClick={() => { onRemove(); onOpenChange(false); }}
              className="mr-auto rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#E5726A] hover:bg-[#E5726A]/10 transition-colors cursor-pointer">
              Remove image
            </button>
            <button type="button" onClick={() => onOpenChange(false)}
              className="rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#8E8E9A] hover:text-[#ECECF1] transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit"
              className="rounded-lg bg-orange hover:bg-orange-hover px-3.5 py-2.5 text-[13px] font-semibold text-[#120C06] transition-colors cursor-pointer">
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
