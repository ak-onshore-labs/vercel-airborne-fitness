import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getClassTypeImageSrc, getClassTypeInitials } from "@/lib/classTypeImages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ClassTypePickerItem {
  id: string;
  name: string;
}

interface ClassTypeCirclePickerProps {
  classTypes: ClassTypePickerItem[];
  selectedClassType: ClassTypePickerItem | null;
  selectedPlans: Array<{ category: string }>;
  onSelectClassType: (cls: ClassTypePickerItem) => void;
}

export function ClassTypeCirclePicker({
  classTypes,
  selectedClassType,
  selectedPlans,
  onSelectClassType,
}: ClassTypeCirclePickerProps) {
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selectedClassType?.id) return;
    const el = itemRefs.current.get(selectedClassType.id);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selectedClassType?.id]);

  return (
    <div
      role="tablist"
      aria-label="Class types"
      className="flex gap-3 overflow-x-auto overflow-y-visible pt-2 pb-2 -mx-6 px-6 scrollbar-hide touch-pan-x overscroll-x-contain"
    >
      {classTypes.map((cls) => {
        const isSelected = selectedClassType?.id === cls.id;
        const hasPlan = selectedPlans.some((p) => p.category === cls.name);
        const imageSrc = getClassTypeImageSrc(cls.name);
        const initials = getClassTypeInitials(cls.name);

        return (
          <button
            key={cls.id}
            ref={(el) => {
              if (el) itemRefs.current.set(cls.id, el);
              else itemRefs.current.delete(cls.id);
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={cls.name}
            data-testid={`button-category-${cls.id}`}
            onClick={() => onSelectClassType(cls)}
            className={cn(
              "relative shrink-0 flex w-[72px] flex-col items-center gap-1 outline-none",
              "focus-visible:ring-2 focus-visible:ring-airborne-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
            )}
          >
            <div className="relative">
              <Avatar
                className={cn(
                  "h-16 w-16 transition-shadow",
                  imageSrc ? "bg-[#ffffff]" : undefined,
                  isSelected
                    ? "ring-2 ring-airborne-teal ring-offset-2 ring-offset-background shadow-[0_0_12px_rgba(4,192,193,0.35)]"
                    : "ring-1 ring-gray-200 dark:ring-white/10"
                )}
              >
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
              {hasPlan && (
                <span
                  className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0B0B0C] bg-airborne-teal dark:border-[#111113]"
                  aria-hidden
                />
              )}
            </div>
            <span
              className={cn(
                "max-w-[72px] text-center text-[11px] leading-tight line-clamp-2",
                isSelected
                  ? "font-semibold text-gray-900 dark:text-[#EDEDED]"
                  : "font-medium text-gray-500 dark:text-[#9CA3AF]"
              )}
            >
              {cls.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
