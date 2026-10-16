import {redirect} from "next/navigation";
import {verifyCheckoutSession} from "@/features/billing/api/billing-server";
import {SuccessPage} from "@/features/billing/checkout-result/success-page";

export default async function BillingSuccessPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ session_id?: string }>;
}>) {
  const { session_id } = await searchParams;

  if (!session_id || !(await verifyCheckoutSession(session_id))) {
    redirect("/billing");
  }

  return <SuccessPage />;
}
