"use client";

import Link from "next/link";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUDIENCE_OPS,
  TOTAL_AUDIENCE,
  columnFor,
  type AudienceColumn,
  type AudienceFilter,
} from "@/lib/campaigns/audience";

const selectTriggerClass =
  "h-[38px] box-border bg-[#101015] border border-[#26262F] rounded-lg px-[10px] font-mono text-[12.5px] text-[#ECECF1] cursor-pointer";
const selectContentClass =
  "bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]";
const selectItemClass =
  "px-[9px] py-[7px] rounded-[5px] font-mono text-[12.5px] text-[#CBCBD4] hover:bg-white/[0.055]";

interface AudienceFiltersProps {
  columns: AudienceColumn[];
  filters: AudienceFilter[];
  counting: boolean;
  recipientCount: number;
  onAdd: () => void;
  onPatch: (id: string, patch: Partial<AudienceFilter>) => void;
  onRemove: (id: string) => void;
}

export function AudienceFilters({
  columns,
  filters,
  counting,
  recipientCount,
  onAdd,
  onPatch,
  onRemove,
}: Readonly<AudienceFiltersProps>) {
  const matchSummary = counting
    ? "updating…"
    : `${Math.round((recipientCount / TOTAL_AUDIENCE) * 100)}% of your audience`;
  const hasColumns = columns.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {filters.length === 0 ? (
        <div className="flex items-center gap-3 flex-wrap text-[13px] text-[#71717D]">
          <span>
            Sending to everyone ·{" "}
            <span className="font-mono text-[#8E8E9A] [font-variant-numeric:tabular-nums]">
              {TOTAL_AUDIENCE.toLocaleString()}
            </span>{" "}
            users
          </span>
          {hasColumns ? (
            <button
              type="button"
              onClick={onAdd}
              className="text-[#8E8E9A] hover:text-[#CBCBD4] transition-colors cursor-pointer"
            >
              + Add filter
            </button>
          ) : (
            <span className="text-[12.5px] text-[#5C5C66]">
              No filterable columns configured —{" "}
              <Link
                href="/settings"
                className="text-orange hover:text-orange-hover"
              >
                set some up in Settings
              </Link>
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filters.map((f) => {
            const def = columnFor(columns, f.column);
            const ops = AUDIENCE_OPS[def.type];
            return (
              <div
                key={f.id}
                className="grid grid-cols-[1fr_92px_1fr_28px] gap-2 items-center box-border"
              >
                <Select
                  value={f.column}
                  onValueChange={(column) => {
                    const next = columnFor(columns, column);
                    onPatch(f.id, {
                      column,
                      op: AUDIENCE_OPS[next.type][0][0],
                      value: next.type === "boolean" ? "true" : "",
                    });
                  }}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {columns.map((c) => (
                      <SelectItem
                        key={c.name}
                        value={c.name}
                        className={selectItemClass}
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={f.op}
                  onValueChange={(op) => onPatch(f.id, { op })}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {ops.map(([value, label]) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className={selectItemClass}
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {def.type === "boolean" ? (
                  <Select
                    value={f.value}
                    onValueChange={(value) => onPatch(f.id, { value })}
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      <SelectItem value="true" className={selectItemClass}>
                        true
                      </SelectItem>
                      <SelectItem value="false" className={selectItemClass}>
                        false
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    value={f.value}
                    onChange={(e) => onPatch(f.id, { value: e.target.value })}
                    placeholder={
                      def.type === "timestamptz" ? "2026-01-01" : "value"
                    }
                    className="w-full h-9.5 box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-2.5 font-mono text-[12.5px] text-[#ECECF1] outline-none"
                  />
                )}

                <button
                  type="button"
                  onClick={() => onRemove(f.id)}
                  aria-label="Remove filter"
                  className="w-6.5 h-6.5 rounded-md flex items-center justify-center hover:bg-white/[0.07] transition-colors cursor-pointer"
                >
                  <X size={11} className="text-[#7A7A85]" />
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-3.5 mt-0.5">
            {hasColumns && (
              <button
                type="button"
                onClick={onAdd}
                className="text-[13px] text-[#8E8E9A] hover:text-[#CBCBD4] transition-colors cursor-pointer"
              >
                + Add filter
              </button>
            )}
            <span className="text-[12.5px] text-[#5C5C66]">{matchSummary}</span>
          </div>
        </div>
      )}
    </div>
  );
}
