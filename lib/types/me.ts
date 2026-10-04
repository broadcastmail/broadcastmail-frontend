export type PlanId = "FREE" | "PRO";

export interface MeResponse {
  email: string;
  plan: PlanId;
  connectionName: string | null;
}
