"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { connectEmailProvider } from "@/lib/api/email-provider";
import {
  emailProviderSchema,
  type EmailProviderFormValues,
} from "@/lib/schemas/onboarding";
import { Spinner } from "@/components/onboarding/spinner";

type KeyState = "idle" | "testing" | "verified";

interface EmailProviderConnectFormProps {
  heading?: string;

  onConnected: (values: EmailProviderFormValues) => void;
}

export function EmailProviderConnectForm({
  heading,
  onConnected,
}: EmailProviderConnectFormProps) {
  const [state, setState] = useState<KeyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EmailProviderFormValues>({
    resolver: zodResolver(emailProviderSchema),
    mode: "onBlur",
    defaultValues: { apiKey: "", fromAddress: "" },
  });
  const fromAddress = useWatch({ control, name: "fromAddress" });

  async function onSubmit(values: EmailProviderFormValues) {
    if (state === "testing") return;
    setState("testing");
    setError(null);
    try {
      await connectEmailProvider(values);
      setState("verified");
      onConnected(values);
    } catch {
      setState("idle");
      setError("Couldn't connect that key — check it and try again.");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {heading && (
          <div className="text-[16px] font-semibold text-[#ECECF1]">
            {heading}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 box-border bg-[#18130E] border border-orange rounded-lg px-3 py-2.75">
            <div className="w-3.75 h-3.75 rounded-sm bg-white flex items-center justify-center text-2.5 font-semibold text-[#0B0B0F] shrink-0">
              R
            </div>
            <div className="text-[13px] font-medium text-[#ECECF1]">Resend</div>
          </div>
          <div className="flex-1 flex items-center gap-2 box-border bg-[#101015] border border-[#26262F] rounded-lg px-3 py-2.75 opacity-55 cursor-not-allowed">
            <div className="w-3.75 h-3.75 rounded-sm bg-[#26262F] flex items-center justify-center font-mono text-[9px] font-semibold text-[#8E8E9A] shrink-0">
              S
            </div>
            <div className="flex-1 text-[13px] font-medium text-[#8E8E9A]">
              Amazon SES
            </div>
            <div className="font-mono text-[9.5px] tracking-[0.04em] text-[#5C5C66]">
              SOON
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <div className="text-[12px] font-medium text-[#8E8E9A]">
            Resend API key
          </div>
          <input
            {...register("apiKey")}
            disabled={state !== "idle"}
            placeholder="re_…"
            aria-invalid={!!errors.apiKey}
            className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 font-mono text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none disabled:opacity-60 aria-invalid:border-[#E5726A]"
          />
          {errors.apiKey && (
            <p className="text-[12px] text-[#E5726A]">
              {errors.apiKey.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-[12px] font-medium text-[#8E8E9A]">
            Send from
          </div>
          <input
            {...register("fromAddress")}
            disabled={state !== "idle"}
            placeholder="you@yourdomain.com"
            aria-invalid={!!errors.fromAddress}
            className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-2.5 font-mono text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none disabled:opacity-60 aria-invalid:border-[#E5726A]"
          />
          {errors.fromAddress && (
            <p className="text-[12px] text-[#E5726A]">
              {errors.fromAddress.message}
            </p>
          )}
        </div>

        {state === "idle" && !error && (
          <p className="text-[12.5px] text-[#71717D]">
            We&apos;ll send a test email the moment you connect.
          </p>
        )}
        {state === "testing" && (
          <div className="flex items-center gap-2">
            <Spinner size={13} className="border-[#26262F] border-t-orange" />
            <p className="text-[12.5px] text-[#8E8E9A]">
              Verifying and sending a test email…
            </p>
          </div>
        )}
        {state === "verified" && (
          <p className="text-[12.5px] text-[#4ADE80]">
            Test email delivered
            <span className="text-[#8E8E9A]"> — check {fromAddress}</span>
          </p>
        )}
        {error && <p className="text-[12.5px] text-[#E5726A]">{error}</p>}

        {state === "idle" && (
          <button
            type="submit"
            className="flex items-center justify-center bg-[#17171D] hover:not-disabled:border-[#3A3A46] border border-[#26262F] text-[#ECECF1] text-[13px] font-medium rounded-lg py-2.75 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Resend
          </button>
        )}

        {state === "idle" && (
          <div className="flex flex-col gap-2.5 box-border bg-[#101015] border border-[#1E1E26] rounded-lg p-3 mt-1.5">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[12.5px] text-[#CBCBD4] font-medium cursor-pointer"
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                className="transition-transform"
                style={{ transform: helpOpen ? "rotate(90deg)" : "none" }}
                aria-hidden="true"
              >
                <path
                  d="M2 1 6 4 2 7"
                  stroke="#8E8E9A"
                  strokeWidth={1.5}
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              Don&apos;t have a Resend account?
            </button>
            {helpOpen && (
              <div className="flex flex-col gap-2 text-[12.5px] leading-[1.6] text-[#8E8E9A]">
                <div className="flex gap-2">
                  <span className="font-mono text-[12px] text-orange">1</span>
                  <span>
                    Create a free account at{" "}
                    <span className="font-mono text-[12px] text-[#CBCBD4]">
                      resend.com
                    </span>{" "}
                    — 3,000 emails/month free.
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-[12px] text-orange">2</span>
                  <span>
                    Verify your sending domain under{" "}
                    <span className="font-mono text-[12px] text-[#CBCBD4]">
                      Domains → Add domain
                    </span>{" "}
                    (two DNS records).
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-[12px] text-orange">3</span>
                  <span>
                    Go to{" "}
                    <span className="font-mono text-[12px] text-[#CBCBD4]">
                      API Keys → Create API key
                    </span>{" "}
                    and paste it above.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </>
  );
}
