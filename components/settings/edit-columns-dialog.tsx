"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SchemaFlow } from "@/components/onboarding/schema/schema-flow";
import { updateReconnectColumns } from "@/lib/api/schema";
import type { SchemaIntrospectionResult } from "@/lib/types/onboarding";

interface EditColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: SchemaIntrospectionResult | null;
}

// Reuses SchemaFlow's column picker; `schema` should already be DETECTED.
// DialogTitle is sr-only — SchemaFlow has its own heading.
export function EditColumnsDialog({
  open,
  onOpenChange,
  schema,
}: EditColumnsDialogProps) {
  const router = useRouter();

  function handleComplete() {
    toast.success("Filterable columns updated");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="sr-only">Filterable columns</DialogTitle>
        <SchemaFlow
          schema={schema}
          onComplete={handleComplete}
          onConfirm={updateReconnectColumns}
          skipReview
        />
      </DialogContent>
    </Dialog>
  );
}
