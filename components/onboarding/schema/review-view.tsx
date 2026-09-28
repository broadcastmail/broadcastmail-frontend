import { CheckIcon } from "@/components/onboarding/check-icon";
import { Spinner } from "@/components/onboarding/spinner";
import type { ResolvedSchema } from "@/lib/types/onboarding";
import { SchemaSqlPreview } from "./schema-sql-preview";

interface ReviewViewProps {
  resolved: ResolvedSchema;
  hasTable: boolean;
  enabled: Set<string>;
  running: boolean;
  onBack: () => void;
  onRunSetup: () => void;
}

export function ReviewView({
  resolved,
  hasTable,
  enabled,
  running,
  onBack,
  onRunSetup,
}: Readonly<ReviewViewProps>) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          Set up read-only access
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A]">
          Here&apos;s exactly what we&apos;ll run on{" "}
          <span className="font-mono text-[12.5px] text-[#CBCBD4]">
            {resolved.userTableSchema}.{resolved.userTableName}
          </span>
        </p>
      </div>

      <SchemaSqlPreview
        password="[auto-generated]"
        userIdColumn={resolved.userIdColumn}
        authColumns={resolved.authColumns
          .filter((c) => enabled.has(c.columnName))
          .map((c) => c.columnName)}
        grantsTable={hasTable}
        tableSchema={resolved.userTableSchema}
        tableName={resolved.userTableName}
      />

      <div className="flex flex-col gap-[7px] text-[12.5px] leading-[1.5] text-[#8E8E9A]">
        <div className="flex gap-2 items-baseline">
          <CheckIcon />
          Can only read what you selected — nothing else
        </div>
        <div className="flex gap-2 items-baseline">
          <CheckIcon />
          Cannot write, delete, or modify anything
        </div>
        <div className="flex gap-2 items-baseline">
          <CheckIcon />
          Revoke anytime: <span className="font-mono text-[11.5px] text-[#CBCBD4]">DROP ROLE broadcastmail_reader</span>
        </div>
      </div>

      <div className="flex items-center gap-[14px]">
        <button
          type="button"
          onClick={onBack}
          disabled={running}
          className="text-[13px] text-[#71717D] hover:text-[#8E8E9A] cursor-pointer whitespace-nowrap"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onRunSetup}
          disabled={running}
          className="flex-1 flex items-center justify-center gap-2 bg-orange hover:bg-orange-hover text-[#120C06] text-[14px] font-semibold rounded-lg py-3 cursor-pointer transition-colors disabled:cursor-wait"
        >
          {running && (
            <Spinner className="border-[rgba(18,12,6,0.3)] border-t-[#120C06]" />
          )}
          {running ? "Running setup…" : `Run setup on ${resolved.userTableSchema}.${resolved.userTableName}`}
        </button>
      </div>
    </div>
  );
}
