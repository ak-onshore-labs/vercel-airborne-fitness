import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ActiveFilter = "all" | "active" | "inactive";

export const ACTIVE_FILTER_OPTIONS: Array<{ value: ActiveFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export interface ActiveFilterSelectProps {
  value: ActiveFilter;
  onChange: (value: ActiveFilter) => void;
  className?: string;
}

export function ActiveFilterSelect({ value, onChange, className }: ActiveFilterSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ActiveFilter)}>
      <SelectTrigger
        aria-label="Filter by status"
        className={className ?? "w-[140px]"}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ACTIVE_FILTER_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function applyActiveFilterAndSort<T extends { isActive: boolean }>(
  items: T[],
  filter: ActiveFilter,
): T[] {
  const filtered =
    filter === "all"
      ? items
      : filter === "active"
      ? items.filter((x) => x.isActive)
      : items.filter((x) => !x.isActive);
  return [...filtered].sort((a, b) => Number(b.isActive) - Number(a.isActive));
}

export function inactiveRowClass(isActive: boolean): string {
  return isActive
    ? ""
    : "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200";
}
