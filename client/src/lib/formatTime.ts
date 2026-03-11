/**
 * Formats a 24h "HH:mm" or ISO-like time string to 12h with am/pm (e.g. "09:00" → "9:00 AM").
 * For display only; does not mutate or change API data.
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr || typeof timeStr !== "string") return timeStr;
  const trimmed = timeStr.trim();
  let h: number;
  let m: number;
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return timeStr;
    h = d.getHours();
    m = d.getMinutes();
  } else {
    const parts = trimmed.split(/[:\s]/).map(Number);
    h = parts[0];
    m = parts[1] ?? 0;
  }
  if (!Number.isFinite(h) || h < 0 || h > 23) return timeStr;
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "AM" : "PM";
  const minStr = Number.isFinite(m) ? `:${String(m).padStart(2, "0")}` : "";
  return `${hour12}${minStr} ${ampm}`;
}
