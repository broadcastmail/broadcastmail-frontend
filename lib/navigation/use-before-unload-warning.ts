"use client";

import { useEffect } from "react";

export function useBeforeUnloadWarning(shouldWarn: boolean): void {
  useEffect(() => {
    if (!shouldWarn) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldWarn]);
}
