import { useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MemberDialogContent } from "@/components/MemberDialogContent";
import type { ClassMedia } from "@/lib/classMedia";

interface ClassVideoDialogProps {
  /** Non-null opens the dialog and mounts the single video; null closes it. */
  media: ClassMedia | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Tap-to-play class preview. Exactly one <video> is mounted at a time: Radix
 * unmounts the dialog content (and therefore the video) when closed, releasing
 * memory. Falls back to the poster if the video fails to load.
 */
export function ClassVideoDialog({ media, onOpenChange }: ClassVideoDialogProps) {
  const [failed, setFailed] = useState(false);
  const open = media !== null;
  const title = media?.videoTitle ?? media?.className ?? "Class preview";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFailed(false);
        onOpenChange(next);
      }}
    >
      <MemberDialogContent className="p-4">
        <DialogHeader className="mb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Video preview for {media?.className ?? "this class"}.
          </DialogDescription>
        </DialogHeader>

        {media?.videoSrc && !failed ? (
          <video
            key={media.videoSrc}
            className="aspect-[9/16] max-h-[70vh] w-full rounded-lg bg-black object-contain"
            src={media.videoSrc}
            poster={media.posterSrc}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          />
        ) : media?.posterSrc ? (
          <img
            src={media.posterSrc}
            alt={`${media.className} preview unavailable`}
            className="aspect-[9/16] max-h-[70vh] w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex aspect-[9/16] max-h-[70vh] w-full items-center justify-center rounded-lg bg-gray-100 dark:bg-[#18181B] text-sm text-gray-500 dark:text-[#9CA3AF]">
            Preview unavailable
          </div>
        )}
      </MemberDialogContent>
    </Dialog>
  );
}
