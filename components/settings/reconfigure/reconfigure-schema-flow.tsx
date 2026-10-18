"use client";

import {useRouter} from "next/navigation";
import {SchemaFlow} from "@/components/onboarding/schema/schema-flow";
import {confirmSchema1, reconfigure} from "@/lib/api/generated/connections/connections";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";

interface ReconfigureSchemaFlowProps {
  schema: SchemaIntrospectionResult | null;
}

// Client boundary: the Server Component page fetches `schema` but can't pass callbacks.
export function ReconfigureSchemaFlow({ schema }: Readonly<ReconfigureSchemaFlowProps>) {
  const router = useRouter();

  async function handleComplete() {
    // Finalizes the reconfigure; we navigate to /settings ourselves.
    await reconfigure();
    router.push("/settings");
    router.refresh();
  }

  return (
    <SchemaFlow
      schema={schema}
      onComplete={handleComplete}
      onConfirm={(columnNames) => confirmSchema1({ columnNames })}
    />
  );
}
