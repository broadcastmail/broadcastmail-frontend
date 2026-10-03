"use client";

import { useEffect } from "react";
import { useUnsavedChangesGuard } from "@/lib/navigation/unsaved-changes-guard";

export function useUnsavedChangesSync(dirty: boolean): void {
  const { setHasUnsavedChanges } = useUnsavedChangesGuard();
  useEffect(() => {
    setHasUnsavedChanges(dirty);
    return () => setHasUnsavedChanges(false);
  }, [dirty, setHasUnsavedChanges]);
}
