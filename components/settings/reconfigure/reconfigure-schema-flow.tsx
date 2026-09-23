"use client";

import { useRouter } from "next/navigation";
import { SchemaFlow } from "@/components/onboarding/schema/schema-flow";
import { confirmReconfigureSchema, completeReconfigure } from "@/lib/api/schema";
import type { SchemaIntrospectionResult } from "@/lib/types/onboarding";

interface ReconfigureSchemaFlowProps {
  schema: SchemaIntrospectionResult | null;
}

// Client boundary: the Server Component page fetches `schema` but can't pass callbacks.
export function ReconfigureSchemaFlow({ schema }: ReconfigureSchemaFlowProps) {
  const router = useRouter();

  async function handleComplete() {
    // Finalizes the reconfigure; we navigate to /settings ourselves.
    await completeReconfigure();
    router.push("/settings");
    router.refresh();
  }

  return (
    <SchemaFlow
      schema={schema}
      onComplete={handleComplete}
      onConfirm={confirmReconfigureSchema}
    />
  );
}
