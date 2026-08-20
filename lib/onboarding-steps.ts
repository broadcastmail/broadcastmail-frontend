import type { OnboardingStep } from "@/lib/types/onboarding";

// Pure client-safe constant — deliberately kept out of lib/api/onboarding.ts,
// which pulls in next/headers via forwardedCookieHeader and can't be
// imported from "use client" components (Turbopack errors: "next/headers"
// is Server Components only). Server pages and client components both
// import the map from here instead.
export const ONBOARDING_STEP_PATH: Record<OnboardingStep, string> = {
  CONNECT_SUPABASE: "/",
  CONFIRM_SCHEMA: "/onboarding/schema",
  CONNECT_RESEND: "/onboarding/email-provider",
  CONFIRM_ACCOUNT: "/onboarding/confirm",
};
