"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { selectTable } from "@/lib/api/schema";
import { ONBOARDING_STEP_PATH } from "@/lib/onboarding-steps";
import type { DetectedSchema, SchemaIntrospectionResult } from "@/lib/types/onboarding";
import { CheckIcon } from "@/components/onboarding/check-icon";
import { Spinner } from "@/components/onboarding/spinner";
import { SchemaColumns } from "./schema-columns";
import { SchemaSqlPreview } from "./schema-sql-preview";
import { SchemaTablePicker } from "./schema-table-picker";

// table-picker -> columns -> review -> (fallback if confirm fails)
type View = "table-picker" | "columns" | "review" | "fallback";

async function defaultConfirm(columnNames: string[]): Promise<void> {
  await apiClient.post("/api/v1/onboarding/schema/confirm", { columnNames });
}

function defaultSelectTable(candidate: DetectedSchema) {
  return selectTable(candidate.userTableSchema, candidate.userTableName);
}

interface SchemaFlowProps {
  schema: SchemaIntrospectionResult | null;
  /** Defaults to advancing the onboarding wizard; edit dialogs override it. */
  onComplete?: () => void;
  /** Defaults to onboarding's own confirm endpoint; reconnect dialogs override it. */
  onConfirm?: (columnNames: string[]) => Promise<void>;
  /** Defaults to onboarding's selectTable; reconnect dialogs PATCH the table directly. */
  onSelectTable?: (
    candidate: DetectedSchema,
  ) => Promise<{ status: "DETECTED" } & DetectedSchema>;
}

export function SchemaFlow({
  schema,
  onComplete,
  onConfirm = defaultConfirm,
  onSelectTable = defaultSelectTable,
}: SchemaFlowProps) {
  const router = useRouter();
  // `resolved` is the DETECTED schema every other view reads from.
  const [resolved, setResolved] = useState<
    Extract<SchemaIntrospectionResult, { status: "DETECTED" }> | null
  >(schema?.status === "DETECTED" ? schema : null);
  const [view, setView] = useState<View>(
    schema?.status === "MULTIPLE_CANDIDATES" ? "table-picker" : "columns",
  );
  const [pickingTable, setPickingTable] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(
    () =>
      new Set(
        (schema?.status === "DETECTED" ? schema.filterableColumns : [])
          .filter((c) => c.enabled)
          .map((c) => c.columnName),
      ),
  );
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [savingColumns, setSavingColumns] = useState(false);

  const hasTable = resolved !== null;

  function finish() {
    if (onComplete) onComplete();
    else router.push(ONBOARDING_STEP_PATH.CONNECT_RESEND);
  }

  function toggle(name: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function pickTable(candidate: DetectedSchema) {
    setPickingTable(true);
    setPickError(null);
    try {
      const result = await onSelectTable(candidate);
      setResolved(result);
      setEnabled(new Set(result.filterableColumns.filter((c) => c.enabled).map((c) => c.columnName)));
      setView("columns");
    } catch {
      setPickError("Couldn't select that table — try again.");
    } finally {
      setPickingTable(false);
    }
  }

  // Applies the moment this step is done, not deferred to the review screen.
  async function confirmColumns() {
    if (savingColumns) return;
    setSavingColumns(true);
    try {
      await onConfirm(Array.from(enabled));
      setView("review");
    } finally {
      setSavingColumns(false);
    }
  }

  // Re-sends the same values confirmColumns already saved; can still fail here.
  async function runSetup() {
    setRunning(true);
    try {
      await onConfirm(Array.from(enabled));
      finish();
    } catch {
      // Grant SQL failed to execute — drop to the manual fallback.
      setView("fallback");
    } finally {
      setRunning(false);
    }
  }

  async function retest() {
    setTesting(true);
    setTestError(null);
    try {
      await apiClient.post("/api/v1/onboarding/schema/test");
      finish();
    } catch {
      setTestError(
        "Connection failed — check that you ran the SQL correctly",
      );
    } finally {
      setTesting(false);
    }
  }

  if (!schema) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          We couldn&apos;t read your database
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A]">
          Schema detection failed to return a result. Try reconnecting your
          Supabase project.
        </p>
      </div>
    );
  }

  if (view === "table-picker" && schema.status === "MULTIPLE_CANDIDATES") {
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
          {schema.candidates.map((c) => (
            <button
              key={`${c.userTableSchema}.${c.userTableName}`}
              type="button"
              onClick={() => pickTable(c)}
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

  if (view === "fallback" && resolved) {
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
          authColumns={resolved.authColumns.map((c) => c.columnName)}
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

        {testError && (
          <p className="text-[12.5px] text-[#E5726A]">{testError}</p>
        )}

        <button
          type="button"
          onClick={retest}
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

  if (view === "review" && resolved) {
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
            :
          </p>
        </div>

        <SchemaSqlPreview
          password="[auto-generated]"
          userIdColumn={resolved.userIdColumn}
          authColumns={resolved.authColumns.map((c) => c.columnName)}
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
            onClick={() => setView("columns")}
            disabled={running}
            className="text-[13px] text-[#71717D] hover:text-[#8E8E9A] cursor-pointer whitespace-nowrap"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={runSetup}
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
          onToggle={toggle}
        />
      ) : (
        <SchemaTablePicker />
      )}

      <button
        type="button"
        onClick={confirmColumns}
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
