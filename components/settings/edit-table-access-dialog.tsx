"use client";

import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {SchemaFlow} from "@/components/onboarding/schema/schema-flow";
import {updateColumns, updateTable} from "@/lib/api/generated/connections/connections";
import type {DetectedSchema, SchemaIntrospectionResult,} from "@/lib/types/onboarding";

interface EditTableAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: SchemaIntrospectionResult | null;
}

async function handleSelectTable(candidate: DetectedSchema) {
    await updateTable({ userTableSchema: candidate.userTableSchema, userTableName: candidate.userTableName, userIdColumn: candidate.userIdColumn });
    return { status: "DETECTED" as const, ...candidate };
}

export function EditTableAccessDialog({
  open,
  onOpenChange,
  schema,
}: Readonly<EditTableAccessDialogProps>) {
  const router = useRouter();

  function handleComplete() {
    toast.success("Table access reconfigured");
    onOpenChange(false);
    router.refresh();
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="sr-only">Table access</DialogTitle>
        <SchemaFlow
          schema={schema}
          onComplete={handleComplete}
          onConfirm={(columnNames) => updateColumns({ columnNames })}
          onSelectTable={handleSelectTable}
          skipReview
        />
      </DialogContent>
    </Dialog>
  );
}
