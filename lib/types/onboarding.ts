export type OnboardingStep =
  | "CONNECT_SUPABASE"
  | "CONFIRM_SCHEMA"
  | "CONNECT_RESEND"
  | "CONFIRM_ACCOUNT";

export interface OnboardingRecapData {
  projectRef: string | null;
  confirmedTable: string | null;
  fromAddress: string | null;
}

export interface OnboardingStatusResponse {
  step: OnboardingStep;
  recapData: OnboardingRecapData;
}

export interface DetectedColumn {
  columnName: string;
  columnType: string;
  enabled: boolean;
  cardinality: number | null;
  cardinalityWarning: boolean;
}

export interface DetectedSchema {
  userTableName: string;
  userTableSchema: string;
  userIdColumn: string;
  filterableColumns: DetectedColumn[];
  authColumns: DetectedColumn[];
}

export type SchemaIntrospectionResult =
  | ({ status: "DETECTED" } & DetectedSchema)
  | { status: "MULTIPLE_CANDIDATES"; candidates: DetectedSchema[] }
  | { status: "NOT_DETECTED" };

export type ResolvedSchema = Extract<
  SchemaIntrospectionResult,
  { status: "DETECTED" }
>;
