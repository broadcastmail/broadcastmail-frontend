"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SelectProjectFlow } from "@/components/onboarding/select-project/select-project-flow";
import { SchemaFlow } from "@/components/onboarding/schema/schema-flow";
import {
  getReconnectSchema,
  updateReconnectProject,
  updateReconnectTable,
  updateReconnectColumns,
} from "@/lib/api/schema";
import type { ConnectionProject } from "@/lib/types/connection";
import type { DetectedSchema, SchemaIntrospectionResult } from "@/lib/types/onboarding";

interface ChangeProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fetched by the parent right before this opens. */
  projects: ConnectionProject[];
}

type Stage =
  | { name: "select-project" }
  | { name: "schema"; schema: SchemaIntrospectionResult | null };

// Switches project on the same account, no OAuth. Resets table/columns
// downstream — a different project means a different database.
export function ChangeProjectDialog({
  open,
  onOpenChange,
  projects,
}: ChangeProjectDialogProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "select-project" });

  function handleOpenChange(next: boolean) {
    if (!next) setStage({ name: "select-project" });
    onOpenChange(next);
  }

  async function handleProjectContinue(projectRef: string) {
    await updateReconnectProject(projectRef);
    const schema = await getReconnectSchema(projectRef);
    setStage({ name: "schema", schema });
  }

  function handleSchemaComplete() {
    toast.success("Project changed");
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {stage.name === "select-project" && (
          <>
            <DialogTitle className="sr-only">Change project</DialogTitle>
            <SelectProjectFlow
              partialToken=""
              projects={projects}
              showConnectedBadge={false}
              onContinue={handleProjectContinue}
            />
          </>
        )}

        {stage.name === "schema" && (
          <>
            <DialogTitle className="sr-only">
              Change project — confirm schema access
            </DialogTitle>
            <SchemaFlow
              schema={stage.schema}
              onComplete={handleSchemaComplete}
              onConfirm={updateReconnectColumns}
              onSelectTable={handleSelectTable}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
