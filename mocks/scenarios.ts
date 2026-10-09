// Dev-only. This is the "centralized client" for exercising different
// account states without hand-editing cookies — see app/dev/scenarios for
// where these actually get applied.
//
// Every account-state cookie mocks/handlers/*.ts reads lives here, listed
// once (SCENARIO_COOKIES) so applying a scenario can clear all of them
// before setting the new ones. That "clear everything, then set only
// what this scenario names" is the part that actually matters: a partial
// cookie edit left over from testing something else was the recurring
// source of confusing bugs this session (e.g. Settings showing a stale
// "configured" state after only half of a reconnect had actually run) —
// scenarios are deliberately whole descriptions of a state, never diffs
// against whatever's currently set.
//
// Cookies, not a bigger tool, on purpose: this app's mock backend already
// runs as two separate MSW instances (mocks/node.ts for server-rendered
// pages, mocks/browser.ts for client fetches — see the seeding note in
// mocks/handlers/campaigns.ts) that don't share memory, and cookies are
// the one thing both actually read (see mocks/session.ts's cookieHeader).
// A richer mock-scenario tool (MSW's own server.use() overrides, or a
// Storybook + msw-storybook-addon setup) is the right next step once this
// app has an actual test suite driving it — this is the version that's
// worth having today, for manual exploration in a real browser tab.

import {
    HAS_ACCOUNT_COOKIE,
    ONBOARDING_COLUMNS_COOKIE,
    ONBOARDING_PROJECT_COOKIE,
    ONBOARDING_RESEND_COOKIE,
    ONBOARDING_SCHEMA_COOKIE,
    PLAN_COOKIE,
    SESSION_COOKIE,
} from "./session";

export const SCENARIO_COOKIES = [
  SESSION_COOKIE,
  HAS_ACCOUNT_COOKIE,
  ONBOARDING_PROJECT_COOKIE,
  ONBOARDING_SCHEMA_COOKIE,
  ONBOARDING_COLUMNS_COOKIE,
  ONBOARDING_RESEND_COOKIE,
  PLAN_COOKIE,
] as const;

type ScenarioCookie = (typeof SCENARIO_COOKIES)[number];

export interface Scenario {
  id: string;
  label: string;
  description: string;
  cookies: Partial<Record<ScenarioCookie, string>>;
}

// Every "signed in" scenario needs these two — spread them in rather than
// repeating the pair everywhere below.
const SIGNED_IN = {
  [SESSION_COOKIE]: "mock_api_key_for_dev",
  [HAS_ACCOUNT_COOKIE]: "1",
};

const FULLY_CONFIGURED = {
  ...SIGNED_IN,
  [ONBOARDING_PROJECT_COOKIE]: "my-saas-app",
  [ONBOARDING_SCHEMA_COOKIE]: "1",
  [ONBOARDING_COLUMNS_COOKIE]: "plan,created_at,is_verified",
  [ONBOARDING_RESEND_COOKIE]: "campaigns@my-saas-app.com",
};

export const SCENARIOS: Scenario[] = [
  {
    id: "signed-out",
    label: "Signed out",
    description: "No session — lands on the landing page's Connect Supabase step.",
    cookies: {},
  },
  {
    id: "fresh-account",
    label: "Fresh account, nothing connected",
    description:
      "Signed in, HAS_ACCOUNT_COOKIE set, but no Supabase project at all. Dashboard shows the \"not configured\" banner; every Supabase/email-provider field in Settings reads \"Not configured\" / \"Not connected\".",
    cookies: { ...SIGNED_IN },
  },
  {
    id: "project-only",
    label: "Project connected, schema unconfirmed",
    description:
      "Simulates an interrupted \"Reconfigure connection\"/\"Change project\": a project is picked, but table/filterable columns were never confirmed.",
    cookies: { ...SIGNED_IN, [ONBOARDING_PROJECT_COOKIE]: "my-saas-app" },
  },
  {
    id: "configured-free",
    label: "Fully configured — Free plan",
    description:
      "Project, table, filterable columns and Resend all set. Free plan — Billing shows the usage bar, Settings shows an \"Upgrade to Pro\" link.",
    cookies: { ...FULLY_CONFIGURED, [PLAN_COOKIE]: "free" },
  },
  {
    id: "configured-pro",
    label: "Fully configured — Pro plan",
    description:
      "Same as above, but Pro — Billing and Settings both reflect the Pro variant (no usage bar, \"Manage subscription\" instead of \"Upgrade\").",
    cookies: { ...FULLY_CONFIGURED, [PLAN_COOKIE]: "pro" },
  },
  {
    id: "no-email-provider",
    label: "Supabase configured, Resend missing",
    description:
      "Everything Supabase-side is set; the email provider was never connected. Settings' Email provider section reads \"Not configured\".",
    cookies: {
      ...SIGNED_IN,
      [ONBOARDING_PROJECT_COOKIE]: "my-saas-app",
      [ONBOARDING_SCHEMA_COOKIE]: "1",
          [ONBOARDING_COLUMNS_COOKIE]: "plan,created_at,is_verified",
    },
  },
];

// Whole-state, not a diff — clears every cookie a scenario could touch
// before setting the new ones, so switching from a fully-configured
// scenario to "fresh-account" can't leave old values behind. Then does a
// real navigation (not router.push) so both the browser's own MSW
// instance and a fresh server render pick up the new cookies — app/page.tsx
// already redirects signed-in vs signed-out correctly from "/".
export function applyScenario(scenario: Scenario) {
  const week = 60 * 60 * 24 * 7;
  for (const name of SCENARIO_COOKIES) {
    document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
  for (const [name, value] of Object.entries(scenario.cookies)) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${week}`;
  }
  window.location.href = "/";
}
