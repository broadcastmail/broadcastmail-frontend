export type OnboardingStep =
  | "CONNECT_SUPABASE"
  | "CONFIRM_SCHEMA"
  | "CONNECT_RESEND"
  | "CONFIRM_ACCOUNT";

export interface OnboardingStatusResponse {
  step: OnboardingStep;
  projectRef: string | null;
  projectUrl: string | null;
  confirmedTable: string | null;
  fromAddress: string | null;
}

export interface DetectedColumn {
  columnName: string;
  columnType: string;
  enabled: boolean;
  cardinality: number | null;
  cardinalityWarning: boolean;
}

// One fully-introspected table: the shape shared by the DETECTED result and
// each entry in MULTIPLE_CANDIDATES's `candidates` list.
export interface DetectedSchema {
  userTableName: string;
  userTableSchema: string;
  userIdColumn: string;
  filterableColumns: DetectedColumn[];
  // Flat Supabase Auth metadata columns (e.g. last_sign_in_at,
  // email_confirmed_at) — always from auth.users, same list regardless of
  // which table this candidate is. Replaces the old single `emailColumn`
  // field, which the backend hardcoded and never actually used.
  authColumns: DetectedColumn[];
}

// Tagged union matching the backend's SchemaIntrospectionResult (discriminated
// on `status`, via Jackson's JsonTypeInfo). Zero FK-linked tables found →
// NOT_DETECTED; exactly one → DETECTED; more than one → MULTIPLE_CANDIDATES,
// which the caller must resolve (POST /schema/select-table onboarding-side,
// PATCH /connections/table on reconnect) before it becomes DETECTED.
export type SchemaIntrospectionResult =
  | ({ status: "DETECTED" } & DetectedSchema)
  | { status: "MULTIPLE_CANDIDATES"; candidates: DetectedSchema[] }
  | { status: "NOT_DETECTED" };
