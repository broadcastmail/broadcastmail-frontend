"use client";

import {useState} from "react";
import {toast} from "sonner";

interface CheckoutRedirect {
  redirecting: boolean;
  redirect: (action: () => Promise<void>, errorMessage: string) => void;
}

export function useCheckoutRedirect(): CheckoutRedirect {
  const [redirecting, setRedirecting] = useState(false);

  function redirect(action: () => Promise<void>, errorMessage: string) {
    setRedirecting(true);
    action().catch((err) => {
      console.error(err);
      setRedirecting(false);
      toast.error(errorMessage);
    });
  }

  return { redirecting, redirect };
}
