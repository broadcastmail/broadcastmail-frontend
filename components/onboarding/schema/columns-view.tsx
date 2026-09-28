import { Spinner } from "@/components/onboarding/spinner";
import type { ResolvedSchema } from "@/lib/types/onboarding";
import { SchemaColumns } from "./schema-columns";
import { SchemaTablePicker } from "./schema-table-picker";

interface ColumnsViewProps {
  resolved: ResolvedSchema | null;
  enabled: Set<string>;
  onToggle: (columnName: string) => void;
  hasTable: boolean;
  savingColumns: boolean;
  onConfirm: () => void;
}

export function ColumnsView({
  resolved,
  enabled,
  onToggle,
  hasTable,
  savingColumns,
  onConfirm,
}: Readonly<ColumnsViewProps>) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          {resolved ? "We found your users" : "We couldn't detect your schema automatically"}
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A] text-pretty">
          {resolved
            ? "Confirm the columns BroadcastMail can read. We'll only access what you select."
            : "Pick the table that holds your user data — we only access what you select."}
        </p>
      </div>

      {resolved ? (
        <SchemaColumns
          schema={resolved.userTableSchema}
          table={resolved.userTableName}
          userIdColumn={resolved.userIdColumn}
          authColumns={resolved.authColumns}
          columns={resolved.filterableColumns}
          enabled={enabled}
          onToggle={onToggle}
        />
      ) : (
        <SchemaTablePicker />
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!hasTable || savingColumns}
        className="flex items-center justify-center gap-2 bg-orange hover:not-disabled:bg-orange-hover text-[#120C06] text-[14px] font-semibold rounded-lg py-3 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {savingColumns && (
          <Spinner className="border-[rgba(18,12,6,0.3)] border-t-[#120C06]" />
        )}
        {savingColumns ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
