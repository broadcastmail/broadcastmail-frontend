"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {Dialog, DialogContent, DialogTitle} from "@/components/ui/dialog";
import {SelectProjectFlow} from "@/components/onboarding/select-project/select-project-flow";
import {SchemaFlow} from "@/components/onboarding/schema/schema-flow";
import {detectSchemaForReconnect, updateColumns, updateProject, updateTable,} from "@/lib/api/generated/connections/connections";
import type {ConnectionProject} from "@/lib/types/connection";
import type {DetectedSchema, SchemaIntrospectionResult} from "@/lib/types/onboarding";

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

async function handleSelectTable(candidate: DetectedSchema) {
    await updateTable({ userTableSchema: candidate.userTableSchema, userTableName: candidate.userTableName, userIdColumn: candidate.userIdColumn });
    return { status: "DETECTED" as const, ...candidate };
}
export function ChangeProjectDialog({
  open,
  onOpenChange,
  projects,
}: Readonly<ChangeProjectDialogProps>) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "select-project" });

  async function handleProjectContinue(projectRef: string) {
    await updateProject({ projectRef });
    let schema: SchemaIntrospectionResult | null = null;
    try {
      schema = await detectSchemaForReconnect({ projectRef }) as SchemaIntrospectionResult | null;
    } catch {
      // schema stays null
    }
    setStage({ name: "schema", schema });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setStage({ name: "select-project" });
    onOpenChange(next);
  }



  function handleSchemaComplete() {
    toast.success("Project changed");
    onOpenChange(false);
    router.refresh();
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
              onConfirm={(columnNames) => updateColumns({ columnNames })}
              onSelectTable={handleSelectTable}
              skipReview
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
