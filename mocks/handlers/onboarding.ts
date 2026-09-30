// mocks/handlers/onboarding.ts
import { http, HttpResponse } from "msw";
import {
  SESSION_COOKIE,
  ONBOARDING_COOKIE,
  HAS_ACCOUNT_COOKIE,
  ONBOARDING_PROJECT_COOKIE,
  ONBOARDING_SCHEMA_COOKIE,
  ONBOARDING_RESEND_COOKIE,
  ONBOARDING_COLUMNS_COOKIE,
  ONBOARDING_TABLE_COOKIE,
  hasCookie,
  getCookie,
  setCookie,
  clearCookie,
} from "../session";

// Wizard steps once ONBOARDING_COOKIE is set; OAuth entry lives in oauth.ts.
// Mirrors the real OnboardingController's endpoints.

// Exported so connections.ts (Settings' reconfigure/reconnect) reuses the same mock schema.
export const SCHEMA_META = {
  userTableSchema: "public",
  userTableName: "profiles",
  userIdColumn: "id",
};

// Surfaced when ?candidates=1 is appended, to exercise the MULTIPLE_CANDIDATES picker.
const SECOND_CANDIDATE_META = {
  userTableSchema: "public",
  userTableName: "subscriptions",
  userIdColumn: "user_id",
};

export const SCHEMA_COLUMNS = [
  { columnName: "plan", columnType: "text", cardinality: 3, cardinalityWarning: false },
  { columnName: "created_at", columnType: "timestamptz", cardinality: 312, cardinalityWarning: false },
  { columnName: "is_verified", columnType: "boolean", cardinality: 2, cardinalityWarning: false },
  { columnName: "company_name", columnType: "text", cardinality: 289, cardinalityWarning: true },
];

const SECOND_CANDIDATE_COLUMNS = [
  { columnName: "status", columnType: "text", cardinality: 4, cardinalityWarning: false },
];

// Same list regardless of table — always sourced from auth.users.
const AUTH_COLUMNS = [
  { columnName: "email_confirmed_at", columnType: "timestamptz", cardinality: 2, cardinalityWarning: false },
  { columnName: "last_sign_in_at", columnType: "timestamptz", cardinality: 401, cardinalityWarning: true },
  { columnName: "created_at", columnType: "timestamptz", cardinality: 401, cardinalityWarning: true },
];

function withEnabled(columns: typeof SCHEMA_COLUMNS, enabled: Set<string>) {
  return columns.map((c) => ({ ...c, enabled: enabled.has(c.columnName) }));
}

export function selectedTable(
  request: Request,
): [typeof SCHEMA_META, typeof SCHEMA_COLUMNS] {
  const tableName = getCookie(request, ONBOARDING_TABLE_COOKIE);
  return tableName === SECOND_CANDIDATE_META.userTableName
    ? [SECOND_CANDIDATE_META, SECOND_CANDIDATE_COLUMNS]
    : [SCHEMA_META, SCHEMA_COLUMNS];
}

export function detected(meta: typeof SCHEMA_META, columns: typeof SCHEMA_COLUMNS, enabled: Set<string>) {
  return {
    status: "DETECTED" as const,
    ...meta,
    filterableColumns: withEnabled(columns, enabled),
    authColumns: withEnabled(AUTH_COLUMNS, enabled),
  };
}

// Null if no project connected. Columns stay unchecked until confirm/select-table runs.
export function currentSchema(request: Request) {
  const projectRef = getCookie(request, ONBOARDING_PROJECT_COOKIE);
  if (!projectRef) return null;

  const url = new URL(request.url);
  if (url.searchParams.get("candidates") === "1" && !hasCookie(request, ONBOARDING_SCHEMA_COOKIE)) {
    return {
      status: "MULTIPLE_CANDIDATES" as const,
      candidates: [
        detected(SCHEMA_META, SCHEMA_COLUMNS, new Set()),
        detected(SECOND_CANDIDATE_META, SECOND_CANDIDATE_COLUMNS, new Set()),
      ],
    };
  }

  const raw = getCookie(request, ONBOARDING_COLUMNS_COOKIE);
  const enabled = new Set(raw !== null ? raw.split(",").filter(Boolean) : []);
  const [meta, columns] = selectedTable(request);
  return detected(meta, columns, enabled);
}

export const onboardingHandlers = [
  http.get("*/api/v1/onboarding/status", ({ request }) => {
    if (!hasCookie(request, ONBOARDING_COOKIE)) {
      return HttpResponse.json({
        step: "CONNECT_SUPABASE",
        recapData: { projectRef: null, confirmedTable: null, fromAddress: null },
      });
    }

    const projectRef = getCookie(request, ONBOARDING_PROJECT_COOKIE);
    const schemaConfirmed = hasCookie(request, ONBOARDING_SCHEMA_COOKIE);
    const fromAddress = getCookie(request, ONBOARDING_RESEND_COOKIE);
    const [confirmedMeta] = selectedTable(request);

    const onboardingStrategy = !fromAddress
        ? "CONNECT_RESEND"
        : "CONFIRM_ACCOUNT";
    const step = !schemaConfirmed
      ? "CONFIRM_SCHEMA"
      : onboardingStrategy;
    return HttpResponse.json({
      step,
      // Matches the backend's RecapData.empty() until CONFIRM_ACCOUNT —
      // real values only actually matter on the recap screen itself.
      recapData: {
        projectRef,
        confirmedTable: schemaConfirmed
          ? `${confirmedMeta.userTableSchema}.${confirmedMeta.userTableName}`
          : null,
        fromAddress,
      },
    });
  }),

  // Step — detect schema.
  http.get("*/api/v1/onboarding/schema", ({ request }) => {
    return HttpResponse.json(currentSchema(request));
  }),

  // Step — pick a table from MULTIPLE_CANDIDATES; anything not offered 400s.
  http.post("*/api/v1/onboarding/schema/select-table", async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      userTableSchema?: string;
      userTableName?: string;
    } | null;

    if (
      body?.userTableSchema === SECOND_CANDIDATE_META.userTableSchema &&
      body?.userTableName === SECOND_CANDIDATE_META.userTableName
    ) {
      setCookie(ONBOARDING_TABLE_COOKIE, SECOND_CANDIDATE_META.userTableName, 60 * 30);
      return HttpResponse.json(detected(SECOND_CANDIDATE_META, SECOND_CANDIDATE_COLUMNS, new Set()));
    }
    if (
      body?.userTableSchema === SCHEMA_META.userTableSchema &&
      body?.userTableName === SCHEMA_META.userTableName
    ) {
      setCookie(ONBOARDING_TABLE_COOKIE, SCHEMA_META.userTableName, 60 * 30);
      return HttpResponse.json(detected(SCHEMA_META, SCHEMA_COLUMNS, new Set()));
    }
    return new HttpResponse(null, { status: 400 });
  }),

  // Step — confirm schema. Append ?fail=1 to exercise the fallback screen.
  http.post("*/api/v1/onboarding/schema/confirm", async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("fail") === "1") {
      return new HttpResponse(null, { status: 502 });
    }
    const body = (await request.json().catch(() => null)) as {
      columnNames?: string[];
    } | null;
    if (body?.columnNames) {
      setCookie(ONBOARDING_COLUMNS_COOKIE, body.columnNames.join(","), 60 * 30);
    }
    setCookie(ONBOARDING_SCHEMA_COOKIE, "1", 60 * 30);
    return new HttpResponse(null, { status: 200 });
  }),

  http.post("*/api/v1/onboarding/schema/test", () => {
    setCookie(ONBOARDING_SCHEMA_COOKIE, "1", 60 * 30);
    return new HttpResponse(null, { status: 200 });
  }),

  // Step — connect email provider
  http.post("*/api/v1/onboarding/email-provider", async ({ request }) => {
    const body = (await request.json()) as {
      apiKey?: string;
      fromAddress?: string;
    };
    if (!body.apiKey || !body.fromAddress) {
      return new HttpResponse(null, { status: 400 });
    }
    setCookie(ONBOARDING_RESEND_COOKIE, body.fromAddress, 60 * 30);
    return new HttpResponse(null, { status: 200 });
  }),

  // Step — complete: promote session to real, mark account as existing.
  // Only the wizard token is cleared — project/schema/Resend cookies persist as account config.
  http.post("*/api/v1/onboarding/complete", () => {
    setCookie(SESSION_COOKIE, "mock_api_key_for_dev", 60 * 60 * 24 * 30);
    setCookie(HAS_ACCOUNT_COOKIE, "1", 60 * 60 * 24 * 365);
    clearCookie(ONBOARDING_COOKIE);
    return new HttpResponse(null, {
      status: 302,
      headers: { Location: "/dashboard" },
    });
  }),
];
