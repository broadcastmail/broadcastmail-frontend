"use client";

import {useState} from "react";
import {Eye, Monitor, Smartphone} from "lucide-react";
import {cn} from "@/lib/utils";

type Device = "desktop" | "mobile";

interface PreviewPaneProps {
  previewDoc: string;
  subject: string;
  recipientCount: number;
}

export function PreviewPane({ previewDoc, subject, recipientCount }: Readonly<PreviewPaneProps>) {
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
        className="flex-1 min-h-0 overflow-y-auto bm-scrollbar p-6 flex justify-center bg-[radial-gradient(circle,rgba(255,255,255,0.14)_1.5px,transparent_1.5px)] [background-size:20px_20px]"
      >
        <div
          className={cn(
            "max-w-full h-fit bg-white rounded-[10px] overflow-hidden shadow-[0_18px_44px_rgba(0,0,0,0.5)]",
            mobile ? "w-[375px]" : "w-[600px]",
          )}
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
            sandbox=""
            title="Email preview"
            className={cn("block w-full border-0 bg-white", mobile ? "h-[620px]" : "h-[520px]")}
          />
        </div>
      </div>
    </div>
  );
}
