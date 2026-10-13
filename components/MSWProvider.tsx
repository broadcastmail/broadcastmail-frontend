"use client";

import {useEffect, useState} from "react";

export function MSWProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [ready, setReady] = useState(process.env.NODE_ENV !== "development");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (async () => {
      const { worker } = await import("@/mocks/browser");
      await worker.start({
        onUnhandledRequest: "bypass",
        serviceWorker: { url: "/mockServiceWorker.js" },
      });
      const { hydrateFromServer } = await import("@/mocks/hydrate");
      await hydrateFromServer();
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
