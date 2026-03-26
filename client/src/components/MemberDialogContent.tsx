import React from "react";
import { cn } from "@/lib/utils";
import { DialogContent } from "@/components/ui/dialog";

type Props = React.ComponentProps<typeof DialogContent>;

/**
 * Member-app dialog treatment: breathing room on mobile, subtle Airborne accent.
 * (Used only in member flows; do not use in admin screens.)
 */
export function MemberDialogContent({ className, ...props }: Props) {
  return (
    <DialogContent
      className={cn(
        "w-[calc(100%-2rem)] max-w-md rounded-xl border border-gray-100 dark:border-white/6 shadow-xl dark:shadow-black/30",
        "border-l-2 border-l-airborne-teal dark:border-l-teal-400",
        className
      )}
      {...props}
    />
  );
}

