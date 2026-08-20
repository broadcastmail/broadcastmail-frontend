"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { ONBOARDING_STEP_PATH } from "@/lib/onboarding-steps";
import type { SchemaIntrospectionResult } from "@/lib/types/onboarding";
import { CheckIcon } from "@/components/onboarding/check-icon";
import { Spinner } from "@/components/onboarding/spinner";
import { SchemaColumns } from "./schema-columns";
import { SchemaSqlPreview } from "./schema-sql-preview";
import { SchemaTablePicker } from "./schema-table-picker";

// "columns" -> pick which columns to grant
// "review"  -> recap + real POST /schema/confirm
// "fallback" -> confirm failed; manual SQL + POST /schema/test
type View = "columns" | "review" | "fallback";

export function SchemaFlow({ schema }: { schema: SchemaIntrospectionResult | null }) {
  const router = useRouter();
  const [view, setView] = useState<View>("columns");
  const [enabled, setEnabled] = useState<Set<string>>(
    () =>
      new Set(
        (schema?.filterableColumns ?? [])
          .filter((c) => c.enabled)
          .map((c) => c.columnName),
      ),
  );
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const hasTable = !!schema?.userTableName;

  function toggle(name: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function runSetup() {
    setRunning(true);
    try {
      await apiClient.post("/api/v1/onboarding/schema/confirm", {
        columnNames: Array.from(enabled),
      });
      router.push(ONBOARDING_STEP_PATH.CONNECT_RESEND);
    } catch {
      // The Management API failed to execute the grant SQL on the user's
      // project — drop to the manual fallback.
      setView("fallback");
    } finally {
      setRunning(false);
    }
  }

  async function retest() {
    setTesting(true);
    setTestError(null);
    try {
      // TODO(backend): POST /api/v1/onboarding/schema/test doesn't exist
      // yet — see the missing-endpoints summary.
      await apiClient.post("/api/v1/onboarding/schema/test");
      router.push(ONBOARDING_STEP_PATH.CONNECT_RESEND);
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

  if (view === "fallback") {
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
          userIdColumn={schema.userIdColumn}
          emailColumn={schema.emailColumn}
          grantsTable={hasTable}
          tableSchema={schema.userTableSchema}
          tableName={schema.userTableName}
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

  if (view === "review") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
            Set up read-only access
          </h1>
          <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A]">
            Here&apos;s exactly what we&apos;ll run on{" "}
            <span className="font-mono text-[12.5px] text-[#CBCBD4]">
              {schema.userTableSchema}.{schema.userTableName}
            </span>
            :
          </p>
        </div>

        <SchemaSqlPreview
          password="[auto-generated]"
          userIdColumn={schema.userIdColumn}
          emailColumn={schema.emailColumn}
          grantsTable={hasTable}
          tableSchema={schema.userTableSchema}
          tableName={schema.userTableName}
        />

        <div className="flex flex-col gap-[7px] text-[12.5px] leading-[1.5] text-[#8E8E9A]">
          <div className="flex gap-2 items-baseline">
            <CheckIcon />
            Can only read email addresses — nothing else
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
            {running ? "Running setup…" : `Run setup on ${schema.userTableSchema}.${schema.userTableName}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          {hasTable ? "We found your users" : "We couldn't detect your schema automatically"}
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A] text-pretty">
          {hasTable
            ? "Confirm the columns BroadcastMail can read. We'll only access what you select."
            : "Pick the table that holds your user data — we only access what you select."}
        </p>
      </div>

      {hasTable ? (
        <SchemaColumns
          schema={schema.userTableSchema}
          table={schema.userTableName}
          userIdColumn={schema.userIdColumn}
          emailColumn={schema.emailColumn}
          columns={schema.filterableColumns}
          enabled={enabled}
          onToggle={toggle}
        />
      ) : (
        <SchemaTablePicker />
      )}

      <button
        type="button"
        onClick={() => setView("review")}
        disabled={!hasTable}
        className="flex items-center justify-center bg-orange hover:bg-orange-hover text-[#120C06] text-[14px] font-semibold rounded-lg py-3 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
