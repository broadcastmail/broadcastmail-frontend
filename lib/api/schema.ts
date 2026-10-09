import {apiClient} from "@/lib/api/client/client";
import type {DetectedSchema, SchemaIntrospectionResult,} from "@/lib/types/onboarding";
import type {ConnectionProject} from "@/lib/types/connection";

// Reconfigure (mid-OAuth) schema fetch — GET /api/v1/connections/schema.
export async function getReconfigureSchema(): Promise<SchemaIntrospectionResult | null> {
  try {
    const res = await apiClient.get<SchemaIntrospectionResult>(
      "/api/v1/connections/schema",
    );
    return res.data;
  } catch {
    return null;
  }
}

// Resolves a MULTIPLE_CANDIDATES pick during reconfigure (shared onboarding_session).
export async function selectTable(
  userTableSchema: string,
  userTableName: string,
): Promise<{ status: "DETECTED" } & DetectedSchema> {
  const res = await apiClient.post<{ status: "DETECTED" } & DetectedSchema>(
    "/api/v1/onboarding/schema/select-table",
    { userTableSchema, userTableName },
  );
  return res.data;
}

export async function confirmReconfigureSchema(
  columnNames: string[],
): Promise<void> {
  await apiClient.post("/api/v1/connections/schema/confirm", { columnNames });
}

// Finalizes a reconfigure; caller navigates to /settings itself afterward.
export async function completeReconfigure(): Promise<void> {
  await apiClient.post("/api/v1/connections/reconfigure");
}

// ── Reconnect: editing an already-connected account, no OAuth ─────────────

export async function listReconnectProjects(): Promise<ConnectionProject[]> {
  const res = await apiClient.get<ConnectionProject[]>(
    "/api/v1/connections/supabase/projects",
  );
  return res.data;
}

export async function getReconnectSchema(
  projectRef?: string,
): Promise<SchemaIntrospectionResult | null> {
  try {
    const res = await apiClient.get<SchemaIntrospectionResult>(
      "/api/v1/connections/schema/reconnect",
      projectRef ? { params: { projectRef } } : undefined,
    );
    return res.data;
  } catch {
    return null;
  }
}

export async function updateReconnectProject(
  projectRef: string,
): Promise<void> {
  await apiClient.patch("/api/v1/connections/project", { projectRef });
}

export async function updateReconnectTable(
  userTableSchema: string,
  userTableName: string,
  userIdColumn: string,
): Promise<void> {
  await apiClient.patch("/api/v1/connections/table", {
    userTableSchema,
    userTableName,
    userIdColumn,
  });
}

export async function updateReconnectColumns(
  columnNames: string[],
): Promise<void> {
  await apiClient.patch("/api/v1/connections/columns", { columnNames });
}
