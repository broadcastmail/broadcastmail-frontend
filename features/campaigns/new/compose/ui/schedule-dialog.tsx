"use client";

import {useMemo, useState} from "react";
import {TZDate} from "@date-fns/tz";
import {Dialog, DialogClose, DialogContent} from "@/components/ui/dialog";
import {NativeSelect} from "@/components/ui/native-select";
import {cn} from "@/lib/utils";
import {HOURS, MINUTES, parseSavedSchedule, TIMEZONES, toUtcIso, TZ_OFFSETS} from "../lib/schedule-utils";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScheduledAt?: string | null;
  confirming: boolean;
  onSchedule: (utcIso: string) => void;
}

// ── Inline calendar ──────────────────────────────────────────────────────────

function InlineCalendar({
  date,
  onDateSelect,
}: Readonly<{
    date: Date | undefined;
    onDateSelect: (d: Date) => void;
}>) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewYear, setViewYear] = useState(date?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(date?.getMonth() ?? today.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const leadDays = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const todayKey = today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate();
  const selKey = date ? date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate() : -1;
  const canGoPrev = viewYear * 12 + viewMonth > today.getFullYear() * 12 + today.getMonth();

  function shift(delta: number) {
    const t = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  }

  type Cell =
    | { kind: "empty"; pos: number }
    | { kind: "day"; day: number; past: boolean; selected: boolean; isToday: boolean };

  const cells: Cell[] = [
    ...Array.from({ length: leadDays }, (_, pos): Cell => ({ kind: "empty", pos })),
    ...Array.from({ length: daysInMonth }, (_, i): Cell => {
      const day = i + 1;
      const k = viewYear * 10000 + viewMonth * 100 + day;
      return { kind: "day", day, past: k < todayKey, selected: k === selKey, isToday: k === todayKey };
    }),
  ];

  return (
    <div className="p-3.5 border border-white/[0.07] rounded-[10px] bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[14px] font-medium text-[#ECECF1] pl-1">{monthLabel}</span>
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={!canGoPrev}
            aria-label="Previous month"
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] bg-transparent border-none text-[#B9B9C2] cursor-pointer hover:bg-white/6 disabled:text-[#3A3A42] disabled:cursor-default transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M7.5 2.5 4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] bg-transparent border-none text-[#B9B9C2] cursor-pointer hover:bg-white/6 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M4.5 2.5 8 6 4.5 9.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((w) => (
          <div key={w} className="h-7 flex items-center justify-center font-mono text-[11px] text-[#5C5C66]">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          if (cell.kind === "empty") return <div key={`empty-${cell.pos}`} className="h-[40px]" />;
          const { day, past, selected, isToday } = cell;
          const key = `${viewYear}-${viewMonth}-${day}`;
          if (past) {
            return (
              <div key={key} className="h-[40px] flex items-center justify-center">
                <div className="w-[38px] h-[38px] flex items-center justify-center text-[13px] text-[#3A3A42] tabular-nums cursor-not-allowed">
                  {day}
                </div>
              </div>
            );
          }
          if (selected) {
            return (
              <div key={key} className="h-[40px] flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onDateSelect(new Date(viewYear, viewMonth, day))}
                  className="w-[38px] h-[38px] flex items-center justify-center rounded-lg border-none bg-orange text-[13px] font-semibold text-[#120C06] tabular-nums cursor-pointer"
                >
                  {day}
                </button>
              </div>
            );
          }
          return (
            <div key={key} className="h-[40px] flex items-center justify-center">
              <button
                type="button"
                onClick={() => onDateSelect(new Date(viewYear, viewMonth, day))}
                className="w-[38px] h-[38px] flex flex-col items-center justify-center gap-0.5 rounded-lg border-none bg-transparent text-[13px] text-[#ECECF1] tabular-nums cursor-pointer hover:bg-white/[0.07] transition-colors focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-1"
              >
                <span>{day}</span>
                {isToday && <span className="w-1 h-1 rounded-full bg-orange -mb-1.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────

export function ScheduleDialog({
  open,
  onOpenChange,
  initialScheduledAt,
  confirming,
  onSchedule,
}: Readonly<ScheduleDialogProps>) {
  const localTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [tz, setTz] = useState(localTz);

  const defaults = useMemo(() => {
    if (initialScheduledAt) return parseSavedSchedule(initialScheduledAt, tz);
    const tomorrow = TZDate.tz(tz, Date.now() + 86_400_000);
    return {
      date: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
      hour: "09",
      minute: "00",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScheduledAt]);

  const [date, setDate] = useState<Date | undefined>(defaults.date);
  const [hour, setHour] = useState(defaults.hour);
  const [minute, setMinute] = useState(defaults.minute);

  const { isValid, isPastHint } = useMemo(() => {
    if (!date) return { isValid: false, isPastHint: false };
    try {
      const utc = new Date(toUtcIso(date, hour, minute, tz));
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isTodaySelected =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
      return { isValid: utc > now, isPastHint: isTodaySelected && utc <= now };
    } catch {
      return { isValid: false, isPastHint: false };
    }
  }, [date, hour, minute, tz]);

  function handleConfirm() {
    if (!isValid || confirming || !date) return;
    onSchedule(toUtcIso(date, hour, minute, tz));
  }

  const isUpdate = !!initialScheduledAt;

  let confirmLabel = isUpdate ? "Update schedule" : "Schedule send";
  if (confirming) confirmLabel = "Scheduling…";

  function handleOpenChange(value: boolean) {
    if (confirming) return;
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showClose={false}
        className="max-w-[440px] bg-surface rounded-xl p-0 gap-0 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-[18px] pb-0">
          <h2 className="text-[16px] font-semibold tracking-[-0.015em] text-[#ECECF1] whitespace-nowrap">
            {isUpdate ? "Update schedule" : "Schedule send"}
          </h2>
          <DialogClose
            disabled={confirming}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-transparent border-none text-[#8E8E9A] cursor-pointer hover:bg-white/6 hover:text-[#ECECF1] transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="px-5 pt-[18px] pb-5 flex flex-col gap-[18px]">
          <InlineCalendar date={date} onDateSelect={setDate} />

          <div className="grid gap-2.5" style={{ gridTemplateColumns: "72px 72px minmax(0,1fr)" }}>
            <NativeSelect label="Hour" value={hour} onChange={setHour}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </NativeSelect>
            <NativeSelect label="Minute" value={minute} onChange={setMinute}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </NativeSelect>
            <NativeSelect label="Timezone" value={tz} onChange={setTz}>
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>{zone} {TZ_OFFSETS[zone]}</option>
              ))}
            </NativeSelect>
          </div>

          {isPastHint && (
            <p className="text-[12.5px] text-[#8E8E9A] -mt-1.5">
              That time has already passed in {tz}.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={confirming}
            className="text-[13.5px] font-medium text-[#B9B9C2] bg-transparent border-none rounded-lg px-3 py-[9px] -ml-3 cursor-pointer hover:bg-white/[0.05] hover:text-[#ECECF1] transition-colors disabled:text-[#5C5C66] disabled:cursor-default"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || confirming}
            className={cn(
              "flex items-center gap-2 text-[13.5px] font-semibold border-none rounded-lg px-4 py-[9px] whitespace-nowrap transition-colors active:scale-[0.97]",
              isValid && !confirming
                ? "bg-orange hover:bg-orange-hover text-[#120C06] cursor-pointer"
                : "bg-[#1C1C22] text-[#5C5C66] cursor-not-allowed",
            )}
          >
            {confirming && (
              <span className="w-[13px] h-[13px] box-border rounded-full border-[1.6px] border-white/15 border-t-[#8E8E9A] animate-bmspin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
