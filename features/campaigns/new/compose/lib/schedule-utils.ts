import {TZDate} from "@date-fns/tz";

export const TIMEZONES = Intl.supportedValuesOf("timeZone");

export const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
export const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function getUtcOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    return offsetPart ? offsetPart.value.replace("GMT", "UTC") : "";
  } catch {
    return "";
  }
}

export const TZ_OFFSETS: Record<string, string> = Object.fromEntries(
  TIMEZONES.map((tz) => [tz, getUtcOffset(tz)])
);

export function toUtcIso(date: Date, hour: string, minute: string, tz: string): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  return new TZDate(y, m, d, Number(hour), Number(minute), 0, tz).toISOString();
}

export function parseSavedSchedule(utcIso: string, tz: string): { date: Date; hour: string; minute: string } {
  const zoned = TZDate.tz(tz, new Date(utcIso).getTime());
  return {
    date: new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()),
    hour: String(zoned.getHours()).padStart(2, "0"),
    minute: String(Math.round(zoned.getMinutes() / 5) * 5 % 60).padStart(2, "0"),
  };
}
