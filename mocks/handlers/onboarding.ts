// mocks/handlers/onboarding.ts
import { http, HttpResponse } from "msw";
import {
  SESSION_COOKIE,
  ONBOARDING_COOKIE,
  HAS_ACCOUNT_COOKIE,
  ONBOARDING_PROJECT_COOKIE,
  ONBOARDING_SCHEMA_COOKIE,
  ONBOARDING_RESEND_COOKIE,
  hasCookie,
  getCookie,
  setCookie,
  clearCookie,
} from "../session";

// OAuth entry (authorize/callback/select-project) lives in oauth.ts — this
// file is the wizard steps that follow it, once ONBOARDING_COOKIE is set.
// Mirrors the real OnboardingController: /status, /schema, /schema/confirm,
// /email-provider, /complete. /schema/test doesn't exist on the real
// backend yet (see components/onboarding/schema/schema-flow.tsx) but is
// mocked here anyway so the fallback screen is exercisable in dev.

const MOCK_SCHEMA = {
  userTableSchema: "public",
  userTableName: "profiles",
  emailColumn: "email",
  userIdColumn: "id",
  filterableColumns: [
    { columnName: "plan", columnType: "text", enabled: true, cardinality: 3, cardinalityWarning: false },
    { columnName: "created_at", columnType: "timestamptz", enabled: true, cardinality: 312, cardinalityWarning: false },
    { columnName: "is_verified", columnType: "boolean", enabled: true, cardinality: 2, cardinalityWarning: false },
    { columnName: "company_name", columnType: "text", enabled: false, cardinality: 289, cardinalityWarning: true },
  ],
};

export const onboardingHandlers = [
  http.get("*/api/v1/onboarding/status", ({ request }) => {
    if (!hasCookie(request, ONBOARDING_COOKIE)) {
      return HttpResponse.json({
        step: "CONNECT_SUPABASE",
        projectRef: null,
        projectUrl: null,
        confirmedTable: null,
        fromAddress: null,
      });
    }

    const projectRef = getCookie(request, ONBOARDING_PROJECT_COOKIE);
    const schemaConfirmed = hasCookie(request, ONBOARDING_SCHEMA_COOKIE);
    const fromAddress = getCookie(request, ONBOARDING_RESEND_COOKIE);

    const step = !schemaConfirmed
      ? "CONFIRM_SCHEMA"
      : !fromAddress
        ? "CONNECT_RESEND"
        : "CONFIRM_ACCOUNT";

    return HttpResponse.json({
      step,
      projectRef,
      projectUrl: projectRef ? `https://${projectRef}.supabase.co` : null,
      confirmedTable: schemaConfirmed
        ? `${MOCK_SCHEMA.userTableSchema}.${MOCK_SCHEMA.userTableName}`
        : null,
      fromAddress,
    });
  }),

  // Step — detect schema
  http.get("*/api/v1/onboarding/schema", () => {
    return HttpResponse.json(MOCK_SCHEMA);
  }),

  // Step — confirm schema. Runs the grant SQL via the Management API on the
  // real backend; append ?fail=1 to /onboarding/schema in dev to exercise
  // the fallback screen (no real equivalent — dev-only test hook).
  http.post("*/api/v1/onboarding/schema/confirm", ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("fail") === "1") {
      return new HttpResponse(null, { status: 502 });
    }
    setCookie(ONBOARDING_SCHEMA_COOKIE, "1", 60 * 30);
    return new HttpResponse(null, { status: 200 });
  }),

  // Not on the real controller yet — see schema-flow.tsx's TODO.
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

  // Step — complete onboarding: promote the onboarding session to a real
  // one, and mark the mock account as existing so future OAuth sign-ins
  // are treated as a ReturningUser instead of walking onboarding again.
  http.post("*/api/v1/onboarding/complete", () => {
    setCookie(SESSION_COOKIE, "mock_api_key_for_dev", 60 * 60 * 24 * 30);
    setCookie(HAS_ACCOUNT_COOKIE, "1", 60 * 60 * 24 * 365);
    clearCookie(ONBOARDING_COOKIE);
    clearCookie(ONBOARDING_PROJECT_COOKIE);
    clearCookie(ONBOARDING_SCHEMA_COOKIE);
    clearCookie(ONBOARDING_RESEND_COOKIE);
    return new HttpResponse(null, {
      status: 302,
      headers: { Location: "/dashboard" },
    });
  }),
];
