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

export interface SchemaIntrospectionResult {
  userTableName: string;
  userTableSchema: string;
  emailColumn: string;
  userIdColumn: string;
  filterableColumns: DetectedColumn[];
}
