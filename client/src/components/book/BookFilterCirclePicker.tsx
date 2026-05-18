import { useEffect, useRef } from "react";
import { CircleUser } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClassTypeImageSrc, getClassTypeInitials } from "@/lib/classTypeImages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MY_CLASSES = "My Classes";
const ALL = "All";

interface BookFilterCirclePickerProps {
  filter: string;
  onFilterChange: (value: string) => void;
  classTypes: Array<{ id: string; name: string }>;
}

type FilterItem =
  | { kind: "myClasses"; value: typeof MY_CLASSES }
  | { kind: "all"; value: typeof ALL }
  | { kind: "class"; value: string; id: string };

function buildFilterItems(classTypes: Array<{ id: string; name: string }>): FilterItem[] {
  return [
    { kind: "myClasses", value: MY_CLASSES },
    { kind: "all", value: ALL },
    ...classTypes.map((t) => ({ kind: "class" as const, value: t.name, id: t.id })),
  ];
}

function itemKey(item: FilterItem): string {
  if (item.kind === "class") return item.id;
  return item.value;
}

export function BookFilterCirclePicker({
  filter,
  onFilterChange,
  classTypes,
}: BookFilterCirclePickerProps) {
  const items = buildFilterItems(classTypes);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const match = items.find((item) => item.value === filter);
    if (!match) return;
    const el = itemRefs.current.get(itemKey(match));
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [filter, classTypes]);

  return (
    <div
      role="tablist"
      aria-label="Class filters"
      className="mb-6 flex gap-3 overflow-x-auto overflow-y-visible pt-2 pb-2 -mx-6 px-6 scrollbar-hide touch-pan-x overscroll-x-contain"
    >
      {items.map((item) => {
        const isSelected = filter === item.value;
        const key = itemKey(item);
        const label = item.value;

        const ringClass = isSelected
          ? "ring-2 ring-airborne-teal ring-offset-2 ring-offset-background shadow-[0_0_12px_rgba(4,192,193,0.35)]"
          : "ring-1 ring-gray-200 dark:ring-white/10";

        return (
          <button
            key={key}
            ref={(el) => {
              if (el) itemRefs.current.set(key, el);
              else itemRefs.current.delete(key);
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={label}
            data-testid={`button-filter-${item.value}`}
            onClick={() => onFilterChange(item.value)}
            className={cn(
              "relative shrink-0 flex w-[72px] flex-col items-center gap-1 outline-none",
              "focus-visible:ring-2 focus-visible:ring-airborne-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
            )}
          >
            <div className="relative">
              {item.kind === "myClasses" && (
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff] transition-shadow",
                    ringClass
                  )}
                >
                  <CircleUser className="h-7 w-7 text-gray-600 dark:text-gray-500" strokeWidth={1.75} aria-hidden />
                </div>
              )}

              {item.kind === "all" && (
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full bg-[#ffffff] transition-shadow",
                    ringClass
                  )}
                >
                  <span className="text-sm font-bold text-airborne-teal">All</span>
                </div>
              )}

              {item.kind === "class" && (() => {
                const imageSrc = getClassTypeImageSrc(item.value);
                const initials = getClassTypeInitials(item.value);
                return (
                  <Avatar className={cn("h-16 w-16 transition-shadow", imageSrc ? "bg-[#ffffff]" : undefined, ringClass)}>
                    {imageSrc ? (
                      <AvatarImage src={imageSrc} alt="" className="bg-[#ffffff] object-contain p-1.5" />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        imageSrc
                          ? "bg-[#ffffff]"
                          : "bg-gradient-to-br from-[#18181B] to-airborne-teal/25 text-xs font-semibold text-[#EDEDED]"
                      )}
                    >
                      {imageSrc ? null : initials}
                    </AvatarFallback>
                  </Avatar>
                );
              })()}
            </div>
            <span
              className={cn(
                "max-w-[72px] text-center text-[11px] leading-tight line-clamp-2",
                isSelected
                  ? "font-semibold text-gray-900 dark:text-[#EDEDED]"
                  : "font-medium text-gray-500 dark:text-[#9CA3AF]"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
