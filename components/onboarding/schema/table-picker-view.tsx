import { Spinner } from "@/components/onboarding/spinner";
import type { DetectedSchema } from "@/lib/types/onboarding";

interface TablePickerViewProps {
  candidates: DetectedSchema[];
  pickingTable: boolean;
  pickError: string | null;
  onPick: (candidate: DetectedSchema) => void;
}

// The MULTIPLE_CANDIDATES resolver — not to be confused with
// schema-table-picker.tsx's SchemaTablePicker, the still-unwired manual
// picker shown when nothing was auto-detected at all.
export function TablePickerView({
  candidates,
  pickingTable,
  pickError,
  onPick,
}: Readonly<TablePickerViewProps>) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          We found more than one table
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A] text-pretty">
          Pick the one that holds your user data — we only access what you
          select.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {candidates.map((c) => (
          <button
            key={`${c.userTableSchema}.${c.userTableName}`}
            type="button"
            onClick={() => onPick(c)}
            disabled={pickingTable}
            className="flex items-center justify-between box-border bg-[#101015] border border-[#26262F] hover:border-[#3A3A46] rounded-lg px-3 py-[10px] font-mono text-[13px] text-[#ECECF1] cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-60"
          >
            {c.userTableSchema}.{c.userTableName}
            {pickingTable && (
              <Spinner className="border-[#3A3A46] border-t-[#ECECF1]" />
            )}
          </button>
        ))}
      </div>

      {pickError && <p className="text-[12.5px] text-[#E5726A]">{pickError}</p>}
    </div>
  );
}
