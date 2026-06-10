export type SessionCardTone = "teal" | "magenta" | "muted";

export type ScheduleGenderRestriction = "NONE" | "FEMALE_ONLY";

export function resolveSessionCardTone(opts: {
  isInactive: boolean;
  genderRestriction?: ScheduleGenderRestriction;
}): SessionCardTone {
  if (opts.isInactive) return "muted";
  if (opts.genderRestriction === "FEMALE_ONLY") return "magenta";
  return "teal";
}

export function getSessionCardToneClasses(tone: SessionCardTone): {
  shell: string;
  accentBar: string;
  orb: string;
  femaleOnlyChip: string;
} {
  switch (tone) {
    case "muted":
      return {
        shell:
          "border border-gray-200/80 dark:border-white/8 bg-gradient-to-br from-gray-50/90 to-airborne-muted/12 dark:from-[#111113] dark:to-[#1c1c1a] shadow-none dark:shadow-none opacity-[0.97]",
        accentBar:
          "absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-airborne-muted/60 to-airborne-muted",
        orb:
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-airborne-muted/10 blur-2xl",
        femaleOnlyChip:
          "text-[10px] font-medium text-gray-600 dark:text-[#9CA3AF] px-1.5 py-0.5 rounded bg-gray-200/80 dark:bg-zinc-800/80",
      };
    case "magenta":
      return {
        shell:
          "border border-gray-100 dark:border-white/10 bg-gradient-to-br from-white to-airborne-magenta/[0.08] dark:from-[#111113] dark:to-[#1a0a1c] shadow-sm dark:shadow-black/30",
        accentBar:
          "absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-airborne-magenta/75 to-airborne-magenta",
        orb:
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-airborne-magenta/10 blur-2xl",
        femaleOnlyChip:
          "text-[10px] font-medium text-fuchsia-800 dark:text-fuchsia-200 px-1.5 py-0.5 rounded bg-fuchsia-100/80 dark:bg-fuchsia-950/40",
      };
    case "teal":
    default:
      return {
        shell:
          "border border-gray-100 dark:border-white/10 bg-gradient-to-br from-white to-teal-50/60 dark:from-[#111113] dark:to-[#0c1f20] shadow-sm dark:shadow-black/30",
        accentBar:
          "absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-airborne-teal to-airborne-deep",
        orb:
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-airborne-teal/10 blur-2xl",
        femaleOnlyChip:
          "text-[10px] font-medium text-fuchsia-800 dark:text-fuchsia-200 px-1.5 py-0.5 rounded bg-fuchsia-100/80 dark:bg-fuchsia-950/40",
      };
  }
}
