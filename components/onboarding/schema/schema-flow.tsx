"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { selectTable } from "@/lib/api/schema";
import { ONBOARDING_STEP_PATH } from "@/lib/onboarding-steps";
import type {
  DetectedSchema,
  ResolvedSchema,
  SchemaIntrospectionResult,
} from "@/lib/types/onboarding";
import { NoSchemaView } from "./no-schema-view";
import { TablePickerView } from "./table-picker-view";
import { FallbackView } from "./fallback-view";
import { ReviewView } from "./review-view";
import { ColumnsView } from "./columns-view";

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

// Owns the wizard's state and every handler; each step's markup lives in
// its own sibling view component (SRP — this file only decides which view
// is showing and what it can do, not how it looks).
export function SchemaFlow({
  schema,
  onComplete,
  onConfirm = defaultConfirm,
  onSelectTable = defaultSelectTable,
}: Readonly<SchemaFlowProps>) {
  const router = useRouter();
  // `resolved` is the DETECTED schema every other view reads from.
  const [resolved, setResolved] = useState<ResolvedSchema | null>(
    schema?.status === "DETECTED" ? schema : null,
  );
  const [view, setView] = useState<View>(
    schema?.status === "MULTIPLE_CANDIDATES" ? "table-picker" : "columns",
  );
  const [pickingTable, setPickingTable] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(
    () =>
      new Set(
        (schema?.status === "DETECTED"
          ? [...schema.filterableColumns, ...schema.authColumns]
          : []
        )
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
      setEnabled(
        new Set(
          [...result.filterableColumns, ...result.authColumns]
            .filter((c) => c.enabled)
            .map((c) => c.columnName),
        ),
      );
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
    return <NoSchemaView />;
  }

  if (view === "table-picker" && schema.status === "MULTIPLE_CANDIDATES") {
    return (
      <TablePickerView
        candidates={schema.candidates}
        pickingTable={pickingTable}
        pickError={pickError}
        onPick={pickTable}
      />
    );
  }

  if (view === "fallback" && resolved) {
    return (
      <FallbackView
        resolved={resolved}
        hasTable={hasTable}
        enabled={enabled}
        testing={testing}
        testError={testError}
        onRetest={retest}
      />
    );
  }

  if (view === "review" && resolved) {
    return (
      <ReviewView
        resolved={resolved}
        hasTable={hasTable}
        enabled={enabled}
        running={running}
        onBack={() => setView("columns")}
        onRunSetup={runSetup}
      />
    );
  }

  return (
    <ColumnsView
      resolved={resolved}
      enabled={enabled}
      onToggle={toggle}
      hasTable={hasTable}
      savingColumns={savingColumns}
      onConfirm={confirmColumns}
    />
  );
}
