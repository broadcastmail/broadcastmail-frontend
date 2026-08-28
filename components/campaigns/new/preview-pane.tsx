"use client";

import { useState } from "react";
import { Eye, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Device = "desktop" | "mobile";

interface PreviewPaneProps {
  previewDoc: string;
  subject: string;
  recipientCount: number;
}

export function PreviewPane({ previewDoc, subject, recipientCount }: PreviewPaneProps) {
  const [device, setDevice] = useState<Device>("desktop");
  const mobile = device === "mobile";

  return (
    <div className="flex-1 min-w-0 box-border flex flex-col bg-[#0A0A0D]">
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-[7px] text-[12px] font-medium tracking-[0.04em] uppercase text-[#7A7A85]">
          <Eye size={13} strokeWidth={1.5} />
          Preview
        </div>
        <div className="flex items-center gap-0.5 bg-[#101015] border border-[#1E1E26] rounded-[7px] p-0.5">
          <button
            type="button"
            aria-label="Desktop preview"
            onClick={() => setDevice("desktop")}
            className={cn(
              "w-7 h-6 rounded-[5px] flex items-center justify-center cursor-pointer transition-colors",
              !mobile && "bg-[#232329]",
            )}
          >
            <Monitor size={14} className={!mobile ? "text-[#ECECF1]" : "text-[#5C5C66]"} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Mobile preview"
            onClick={() => setDevice("mobile")}
            className={cn(
              "w-7 h-6 rounded-[5px] flex items-center justify-center cursor-pointer transition-colors",
              mobile && "bg-[#232329]",
            )}
          >
            <Smartphone size={14} className={mobile ? "text-[#ECECF1]" : "text-[#5C5C66]"} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto p-6 flex justify-center"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.14) 1.5px, transparent 1.5px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div
          className="max-w-full h-fit bg-white rounded-[10px] overflow-hidden shadow-[0_18px_44px_rgba(0,0,0,0.5)]"
          style={{ width: mobile ? 375 : 600 }}
        >
          <div className="box-border flex flex-col gap-[3px] px-[18px] py-[14px] bg-[#F4F4F5] border-b border-[#E4E4E7]">
            <div className="flex gap-[7px] text-[11.5px] text-[#71717A]">
              <span className="w-[34px] shrink-0">From</span>
              <span className="text-[#3F3F46]">hello@yourdomain.com</span>
            </div>
            <div className="flex gap-[7px] text-[11.5px] text-[#71717A]">
              <span className="w-[34px] shrink-0">To</span>
              <span className="text-[#3F3F46]">
                {recipientCount.toLocaleString()} recipients
              </span>
            </div>
            <div className="flex gap-[7px] text-[12.5px] text-[#71717A] mt-0.5">
              <span className="w-[34px] shrink-0 text-[11.5px] leading-[18px]">Sub</span>
              <span
                className={cn(
                  "font-semibold",
                  subject.trim() ? "text-[#18181B]" : "text-[#A1A1AA]",
                )}
              >
                {subject.trim() || "No subject"}
              </span>
            </div>
          </div>
          <iframe
            srcDoc={previewDoc}
            // No real inbox executes JS in an email, so the preview
            // shouldn't either — this is the defense-in-depth backstop for
            // whatever slips past the editor's schema (see
            // lib/campaigns/editor-extensions.ts) or arrives via a saved
            // draft loaded straight from the API. An empty sandbox denies
            // scripts, popups, top-navigation and form submission, and
            // (without allow-same-origin) keeps the document in an opaque
            // origin so it can't reach anything on this page even if
            // something did execute.
            sandbox=""
            title="Email preview"
            style={{
              display: "block",
              width: "100%",
              height: mobile ? 620 : 520,
              border: 0,
              background: "#FFFFFF",
            }}
          />
        </div>
      </div>
    </div>
  );
}
