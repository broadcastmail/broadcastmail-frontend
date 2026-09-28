"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SchemaFlow } from "@/components/onboarding/schema/schema-flow";
import { updateReconnectTable, updateReconnectColumns } from "@/lib/api/schema";
import type {
  DetectedSchema,
  SchemaIntrospectionResult,
} from "@/lib/types/onboarding";

interface EditTableAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: SchemaIntrospectionResult | null;
}

export function EditTableAccessDialog({
  open,
  onOpenChange,
  schema,
}: EditTableAccessDialogProps) {
  const router = useRouter();

  function handleComplete() {
    toast.success("Table access reconfigured");
    onOpenChange(false);
    router.refresh();
  }

  async function handleSelectTable(candidate: DetectedSchema) {
    await updateReconnectTable(
      candidate.userTableSchema,
      candidate.userTableName,
      candidate.userIdColumn,
    );
    return { status: "DETECTED" as const, ...candidate };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="sr-only">Table access</DialogTitle>
        <SchemaFlow
          schema={schema}
          onComplete={handleComplete}
          onConfirm={updateReconnectColumns}
          onSelectTable={handleSelectTable}
        />
      </DialogContent>
    </Dialog>
  );
}
