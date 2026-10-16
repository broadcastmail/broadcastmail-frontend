import {redirect} from "next/navigation";
import {verifyCheckoutSession} from "@/features/billing/api/billing-server";
import {CancelPage} from "@/features/billing/checkout-result/cancel-page";

export default async function BillingCancelPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ session_id?: string }>;
}>) {
  const { session_id } = await searchParams;

  if (!session_id || !(await verifyCheckoutSession(session_id))) {
    redirect("/billing");
  }

  return <CancelPage />;
}
