export interface AccountMetricsResponse {
  audience: number;
  audienceSource: string;
  totalDeliveredThisMonth: number;
  deliveryRate: number;
  recipientsUsedThisPeriod: number;
  recipientsLimit: number;
}
