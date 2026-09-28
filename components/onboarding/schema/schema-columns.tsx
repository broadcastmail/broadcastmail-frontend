import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { DetectedColumn } from "@/lib/types/onboarding";

interface SchemaColumnsProps {
  schema: string;
  table: string;
  userIdColumn: string;
  authColumns: DetectedColumn[];
  columns: DetectedColumn[];
  enabled: Set<string>;
  onToggle: (columnName: string) => void;
}

export function SchemaColumns({
  schema,
  table,
  userIdColumn,
  authColumns,
  columns,
  enabled,
  onToggle,
}: SchemaColumnsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-[10px] box-border bg-[#101015] border border-[#1E1E26] rounded-lg p-3">
        <div className="flex items-center gap-[9px]">
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            className="shrink-0"
            aria-hidden="true"
          >
            <rect
              x="2.5"
              y="6"
              width="9"
              height="6.2"
              rx="1.4"
              stroke="#5C5C66"
              fill="none"
              strokeWidth="1.2"
            />
            <path
              d="M4.6 6V4.3a2.4 2.4 0 014.8 0V6"
              stroke="#5C5C66"
              fill="none"
              strokeWidth="1.2"
            />
          </svg>
          <div className="flex-1 font-mono text-[13px] text-[#CBCBD4]">
            auth.users
          </div>
          <div className="font-mono text-[10.5px] tracking-[0.04em] text-[#5C5C66]">
            {userIdColumn} JOIN KEY
          </div>
        </div>
        <div className="flex flex-col gap-[7px] pl-[22px]">
          {authColumns.map((col) => {
            const on = enabled.has(col.columnName);
            return (
              <label
                key={col.columnName}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={on}
                  onCheckedChange={() => onToggle(col.columnName)}
                  className={cn(
                    "w-[13px] h-[13px] box-border rounded-[3.5px] border-[1.5px]",
                    on
                      ? "border-[#F0973F] bg-[#F0973F] text-[#120C06]"
                      : "border-[#3A3A46] bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[12.5px]",
                    on ? "text-[#ECECF1]" : "text-[#8E8E9A]",
                  )}
                >
                  {col.columnName}
                </span>
                <span className="font-mono text-[11px] text-[#5C5C66]">
                  {col.columnType}
                </span>
                {col.cardinalityWarning && (
                  <span className="text-[10.5px] text-orange bg-orange/[0.11] rounded px-[6px] leading-[15px]">
                    high cardinality
                  </span>
                )}
              </label>
            );
          })}
          {authColumns.length === 0 && (
            <p className="text-[12px] text-[#5C5C66]">
              No Supabase Auth metadata columns available.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[10px] box-border bg-[#18130E] border border-[#F0973F] rounded-lg p-3">
        <div className="flex items-center gap-[9px]">
          <span className="w-[14px] h-[14px] box-border rounded-[4px] border-[1.5px] border-[#F0973F] bg-[#F0973F] flex items-center justify-center shrink-0">
            <svg width="9" height="9" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                stroke="#120C06"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="flex-1 font-mono text-[13px] text-[#ECECF1]">
            {schema}.{table}
          </div>
          <div className="font-mono text-[10.5px] tracking-[0.04em] text-[#5C5C66]">
            DETECTED
          </div>
        </div>

        <div className="flex flex-col gap-[7px] pl-[22px]">
          {columns.map((col) => {
            const on = enabled.has(col.columnName);
            return (
              <label
                key={col.columnName}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={on}
                  onCheckedChange={() => onToggle(col.columnName)}
                  className={cn(
                    "w-[13px] h-[13px] box-border rounded-[3.5px] border-[1.5px]",
                    on
                      ? "border-[#F0973F] bg-[#F0973F] text-[#120C06]"
                      : "border-[#3A3A46] bg-transparent",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[12.5px]",
                    on ? "text-[#ECECF1]" : "text-[#8E8E9A]",
                  )}
                >
                  {col.columnName}
                </span>
                <span className="font-mono text-[11px] text-[#5C5C66]">
                  {col.columnType}
                </span>
                {col.cardinalityWarning && (
                  <span className="text-[10.5px] text-orange bg-orange/[0.11] rounded px-[6px] leading-[15px]">
                    high cardinality
                  </span>
                )}
              </label>
            );
          })}
          {columns.length === 0 && (
            <p className="text-[12px] text-[#5C5C66]">
              No additional filterable columns detected on this table.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
