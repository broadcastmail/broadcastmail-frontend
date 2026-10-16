import {Suspense} from "react";
import {BillingContent} from "@/features/billing/billing-content";
import {PortalReturnDialog} from "@/features/billing/checkout-result/portal-return-dialog";

export default function BillingPage() {
  return (
    <>
      <BillingContent />
      <Suspense>
        <PortalReturnDialog />
      </Suspense>
    </>
  );
}
