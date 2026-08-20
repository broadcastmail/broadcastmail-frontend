"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { connectEmailProvider } from "@/lib/api/email-provider";
import {
  emailProviderSchema,
  type EmailProviderFormValues,
} from "@/lib/schemas/onboarding";
import { ONBOARDING_STEP_PATH } from "@/lib/onboarding-steps";
import { CheckIcon } from "@/components/onboarding/check-icon";
import { Spinner } from "@/components/onboarding/spinner";

type KeyState = "idle" | "testing" | "verified";

interface EmailProviderFormProps {
  connectedTable: string | null;
}

export function EmailProviderForm({ connectedTable }: EmailProviderFormProps) {
  const router = useRouter();
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
  // useWatch (not the imperative watch() from useForm) — it's the isolated,
  // memoizable subscription react-hook-form recommends for reading a field
  // value during render, which is what the "check {fromAddress}" line below
  // needs.
  const fromAddress = useWatch({ control, name: "fromAddress" });

  async function onSubmit(values: EmailProviderFormValues) {
    if (state === "testing") return;
    setState("testing");
    setError(null);
    try {
      await connectEmailProvider(values);
      setState("verified");
    } catch {
      setState("idle");
      setError("Couldn't connect that key — check it and try again.");
    }
  }

  function handleFinish() {
    if (state !== "verified") return;
    router.push(ONBOARDING_STEP_PATH.CONFIRM_ACCOUNT);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 bg-[#0F1A15] border border-[#1E3A2E] rounded-lg p-3">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#4ADE80]">
          <CheckIcon size={14} strokeWidth={2} />
          Secure access configured
        </div>
        {connectedTable && (
          <p className="text-[12.5px] leading-[1.6] text-[#8E8E9A]">
            <span className="text-[#CBCBD4]">{connectedTable}</span> connected
            via a read-only role.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-[10px]">
        <div className="text-[16px] font-semibold text-[#ECECF1]">
          Now connect your email provider
        </div>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 box-border bg-[#18130E] border border-orange rounded-lg px-3 py-[11px]">
            <div className="w-[15px] h-[15px] rounded-[4px] bg-white flex items-center justify-center text-[10px] font-semibold text-[#0B0B0F] shrink-0">
              R
            </div>
            <div className="text-[13px] font-medium text-[#ECECF1]">Resend</div>
          </div>
          <div className="flex-1 flex items-center gap-2 box-border bg-[#101015] border border-[#26262F] rounded-lg px-3 py-[11px] opacity-55 cursor-not-allowed">
            <div className="w-[15px] h-[15px] rounded-[4px] bg-[#26262F] flex items-center justify-center font-mono text-[9px] font-semibold text-[#8E8E9A] shrink-0">
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
        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] font-medium text-[#8E8E9A]">
            Resend API key
          </div>
          <input
            {...register("apiKey")}
            disabled={state !== "idle"}
            placeholder="re_…"
            aria-invalid={!!errors.apiKey}
            className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-[10px] font-mono text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none disabled:opacity-60 aria-invalid:border-[#E5726A]"
          />
          {errors.apiKey && (
            <p className="text-[12px] text-[#E5726A]">
              {errors.apiKey.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="text-[12px] font-medium text-[#8E8E9A]">
            Send from
          </div>
          <input
            {...register("fromAddress")}
            disabled={state !== "idle"}
            placeholder="you@yourdomain.com"
            aria-invalid={!!errors.fromAddress}
            className="box-border bg-[#101015] border border-[#26262F] focus:border-orange rounded-lg px-3 py-[10px] font-mono text-[13px] text-[#ECECF1] placeholder:text-[#4C4C58] outline-none disabled:opacity-60 aria-invalid:border-[#E5726A]"
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
            className="flex items-center justify-center bg-[#17171D] hover:not-disabled:border-[#3A3A46] border border-[#26262F] text-[#ECECF1] text-[13px] font-medium rounded-lg py-[11px] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Resend
          </button>
        )}

        {state === "idle" && (
          <div className="flex flex-col gap-[10px] box-border bg-[#101015] border border-[#1E1E26] rounded-lg p-3 mt-[6px]">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="flex items-center gap-[6px] text-[12.5px] text-[#CBCBD4] font-medium cursor-pointer"
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

      <button
        type="button"
        onClick={handleFinish}
        disabled={state !== "verified"}
        className="flex items-center justify-center box-border text-[14px] font-semibold rounded-lg py-3 transition-colors disabled:cursor-not-allowed bg-orange hover:not-disabled:bg-orange-hover text-[#120C06] disabled:bg-[#17171D] disabled:text-[#4C4C58]"
      >
        Finish setup
      </button>
    </div>
  );
}
