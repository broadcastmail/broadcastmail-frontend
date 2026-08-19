"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// TODO(backend): shown when GET /onboarding/schema comes back without a
// detected table. The design mock lets you pick a table manually here, but
// POST /schema/confirm only accepts `columnNames` — there's no way to tell
// the backend which table to use, so this picker is visual only until an
// endpoint exists to (a) list candidate tables and (b) accept a table
// choice. Selecting an option here does not currently do anything.
const PLACEHOLDER_TABLE_OPTIONS = ["profiles", "customers", "users", "members"];

export function SchemaTablePicker() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-medium text-[#8E8E9A]">
        Which table has your user data?
      </div>
      <Select disabled>
        <SelectTrigger className="flex items-center gap-2 box-border bg-[#101015] border border-[#26262F] rounded-lg px-3 py-[10px] cursor-not-allowed">
          <SelectValue placeholder="Select a table…" />
        </SelectTrigger>
        <SelectContent className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
          {PLACEHOLDER_TABLE_OPTIONS.map((t) => (
            <SelectItem
              key={t}
              value={t}
              className="px-[9px] py-[7px] rounded-[5px] font-mono text-[12.5px] text-[#CBCBD4] hover:bg-white/[0.055]"
            >
              public.{t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[12.5px] text-[#71717D]">
        We couldn&apos;t detect your schema automatically, and manual table
        selection isn&apos;t wired up on the backend yet — this picker is a
        placeholder. Contact support to get your table configured directly.
      </p>
    </div>
  );
}
