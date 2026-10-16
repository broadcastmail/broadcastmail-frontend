import type {InputHTMLAttributes, ReactNode} from "react";
import {cn} from "@/lib/utils";

interface DialogFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: ReactNode;
  error?: string;
  mono?: boolean;
}

export function DialogField({id, label, error, mono, ...inputProps}: Readonly<DialogFieldProps>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[#8E8E9A]">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className={cn(
          "box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none aria-invalid:border-[#E5726A]",
          mono && "font-mono",
        )}
      />
      {error && <p className="text-xs text-[#E5726A]">{error}</p>}
    </div>
  );
}
