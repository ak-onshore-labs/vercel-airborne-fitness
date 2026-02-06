import { format, addDays, startOfToday } from "date-fns";

export function getNext7DaysIST() {
  const today = startOfToday();
  return Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(today, i);
    return {
      label: format(date, "EEE"),
      date: date,
      iso: date.toISOString(),
      dayName: format(date, "EEEE")
    };
  });
}
