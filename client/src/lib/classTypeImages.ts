import matPilatesImg from "@/assets/class-types/mat-pilates.png";
import danceFitnessImg from "@/assets/class-types/dance-fitness.png";
import yogaImg from "@/assets/class-types/yoga.png";
import aerialHoopImg from "@/assets/class-types/aerial-hoop.png";
import functionalTrainingImg from "@/assets/class-types/functional-training.png";
import aerialFitnessImg from "@/assets/class-types/aerial-fitness.png";
import trampolineFitnessImg from "@/assets/class-types/trampoline-fitness.png";

/** Trim, lowercase, collapse internal whitespace for stable matching. */
export function normalizeClassTypeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getClassTypeInitials(classTypeName: string): string {
  const words = normalizeClassTypeName(classTypeName).split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Resolve a static class image URL from display name.
 * Priority: exact names → trampoline → hoop/silk → functional → aerial fallback → undefined (initials).
 */
export function getClassTypeImageSrc(classTypeName: string): string | undefined {
  const n = normalizeClassTypeName(classTypeName);

  if (n === "mat pilates") return matPilatesImg;
  if (n === "dance fitness") return danceFitnessImg;
  if (n === "yoga") return yogaImg;
  if (n === "aerial fitness") return aerialFitnessImg;
  if (n === "trampoline fitness" || n.includes("trampoline")) return trampolineFitnessImg;

  if (n.includes("hoop") || n.includes("silk")) return aerialHoopImg;
  if (n.includes("functional")) return functionalTrainingImg;

  if (
    n.includes("kids aerial") ||
    n.includes("kids advance aerial") ||
    n.includes("aerial")
  ) {
    return aerialFitnessImg;
  }

  return undefined;
}
