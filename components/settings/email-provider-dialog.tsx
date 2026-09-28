"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmailProviderConnectForm } from "@/components/onboarding/email-provider/email-provider-connect-form";

interface EmailProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailProviderDialog({
  open,
  onOpenChange,
}: EmailProviderDialogProps) {
  const router = useRouter();

  function handleConnected() {
    toast.success("Email provider connected");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reconfigure email provider</DialogTitle>
          <DialogDescription>
            Your API key is never shown back to you once saved.
          </DialogDescription>
        </DialogHeader>
        <EmailProviderConnectForm onConnected={handleConnected} />
      </DialogContent>
    </Dialog>
  );
}
