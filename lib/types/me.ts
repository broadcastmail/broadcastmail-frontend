export type PlanId = "free" | "pro";

export interface MeResponse {
  email: string;
  plan: PlanId;
  connectionName: string | null;
}
