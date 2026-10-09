"use client";

import {useState} from "react";
import {cn} from "@/lib/utils";
import {campaignSubjectSchema} from "@/lib/schemas/campaigns";

const SUBJECT_LIMIT = 78;

interface SubjectFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function SubjectField({ value, onChange }: Readonly<SubjectFieldProps>) {
  const [touched, setTouched] = useState(false);
  const result = touched ? campaignSubjectSchema.safeParse(value) : null;
  const error = result && !result.success ? result.error.issues[0]?.message : null;

  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="Subject line"
        aria-invalid={!!error}
        className="w-full box-border bg-[#101015] border border-[#26262F] focus:border-orange aria-invalid:border-[#E5726A] rounded-lg px-3.5 py-3 text-[14px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none transition-colors"
      />
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <span className="text-xs text-[#E5726A]">{error}</span>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "shrink-0 font-mono text-[11px]",
            value.length > SUBJECT_LIMIT ? "text-orange" : "text-[#5C5C66]",
          )}
        >
          {value.length} / {SUBJECT_LIMIT}
        </span>
      </div>
    </div>
  );
}
