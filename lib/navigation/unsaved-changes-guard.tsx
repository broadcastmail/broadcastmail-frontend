"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Lets a page with unsaved state (currently just the campaign composer —
// see use-campaign-autosave.ts) tell the top nav's links to confirm before
// leaving. Shared via context, not prop-drilled, because TopNav renders as
// a sibling of the page content in app-shell.tsx, not an ancestor of it.
interface UnsavedChangesGuard {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (dirty: boolean) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesGuard>({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
});

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  return (
    <UnsavedChangesContext.Provider value={{ hasUnsavedChanges, setHasUnsavedChanges }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChangesGuard() {
  return useContext(UnsavedChangesContext);
}

export const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. Leave anyway?";
