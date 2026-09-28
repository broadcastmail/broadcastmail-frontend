import Link from "next/link";
import { SectionCard } from "@/components/layout/section-card";
import { FieldRow } from "@/components/layout/field-row";
import { PLAN_LABEL } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/types/me";

interface AccountSectionProps {
  email: string;
  plan: PlanId;
}

export function AccountSection({ email, plan }: Readonly<AccountSectionProps>) {
  const isFree = plan === "free";

  return (
    <SectionCard title="Account">
      <div className="flex flex-col gap-3.5">
        <FieldRow label="Email">
          <span className="text-[13.5px] text-text-primary">{email}</span>
        </FieldRow>
        <FieldRow label="Plan">
          <div className="flex items-baseline gap-2.25 flex-wrap text-[13.5px] text-text-primary">
            {PLAN_LABEL[plan]}
            {isFree && (
              <>
                <span className="text-text-dim">·</span>
                <Link
                  href="/billing"
                  className="text-[12.5px] text-orange hover:text-orange-hover whitespace-nowrap"
                >
                  Upgrade to Pro →
                </Link>
              </>
            )}
          </div>
        </FieldRow>
      </div>
    </SectionCard>
  );
}
