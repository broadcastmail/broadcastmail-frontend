import { Spinner } from "@/components/onboarding/spinner";
import type { ResolvedSchema } from "@/lib/types/onboarding";
import { SchemaSqlPreview } from "./schema-sql-preview";
import { columnKey } from "./column-key";

interface FallbackViewProps {
  resolved: ResolvedSchema;
  hasTable: boolean;
  enabled: Set<string>;
  testing: boolean;
  testError: string | null;
  onRetest: () => void;
}

// Shown when runSetup's automatic GRANT execution fails — the manual
// copy-paste escape hatch.
export function FallbackView({
  resolved,
  hasTable,
  enabled,
  testing,
  testError,
  onRetest,
}: Readonly<FallbackViewProps>) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          Run one snippet manually
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-orange text-pretty">
          We couldn&apos;t run the setup automatically. It takes 30 seconds
          by hand:
        </p>
      </div>

      <SchemaSqlPreview
        password="[password set by BroadcastMail]"
        userIdColumn={resolved.userIdColumn}
        authColumns={resolved.authColumns
          .filter((c) => enabled.has(columnKey("auth", c.columnName)))
          .map((c) => c.columnName)}
        grantsTable={hasTable}
        tableSchema={resolved.userTableSchema}
        tableName={resolved.userTableName}
      />

      <div className="flex flex-col gap-2 text-[12.5px] leading-[1.5] text-[#8E8E9A]">
        <div className="flex gap-2">
          <span className="font-mono text-[12px] text-orange">1</span>
          <span>Copy the snippet above</span>
        </div>
        <div className="flex gap-2">
          <span className="font-mono text-[12px] text-orange">2</span>
          <span>Open your Supabase project&apos;s SQL editor</span>
        </div>
        <div className="flex gap-2">
          <span className="font-mono text-[12px] text-orange">3</span>
          <span>Paste, click Run, come back here</span>
        </div>
      </div>

      {testError && <p className="text-[12.5px] text-[#E5726A]">{testError}</p>}

      <button
        type="button"
        onClick={onRetest}
        disabled={testing}
        className="flex items-center justify-center gap-2 bg-orange hover:bg-orange-hover text-[#120C06] text-[14px] font-semibold rounded-lg py-3 cursor-pointer transition-colors disabled:cursor-wait"
      >
        {testing && (
          <Spinner className="border-[rgba(18,12,6,0.3)] border-t-[#120C06]" />
        )}
        {testing ? "Testing connection…" : "I've run it — test connection"}
      </button>
    </div>
  );
}
