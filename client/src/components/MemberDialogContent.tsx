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
        "w-[calc(100%-2rem)] max-w-md rounded-xl border border-gray-100 dark:border-gray-700 shadow-xl",
        "border-l-2 border-l-airborne-teal dark:border-l-teal-400",
        className
      )}
      {...props}
    />
  );
}

