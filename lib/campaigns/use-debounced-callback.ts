import { useCallback, useRef } from "react";

interface DebounceController {
  schedule: (fn: () => void, delayMs: number) => void;
  cancel: () => void;
}

export function useDebounceController(): DebounceController {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const cancel = useCallback(() => {
    clearTimeout(timeoutRef.current);
  }, []);

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(fn, delayMs);
  }, []);

  return { schedule, cancel };
}
