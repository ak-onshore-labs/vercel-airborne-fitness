import { normalizeClassTypeName } from "@/lib/classTypeImages";

import aerialFitnessImg from "@/assets/home/class-types/aerial-fitness.png";
import yogaImg from "@/assets/home/class-types/yoga.png";
import aerialSilkHoopImg from "@/assets/home/class-types/aerial-silk-hoop.png";
import danceFitnessImg from "@/assets/home/class-types/dance-fitness.png";
import matPilatesImg from "@/assets/home/class-types/mat-pilates.png";
import functionalTrainingImg from "@/assets/home/class-types/functional-training.png";
import trampolineFitnessImg from "@/assets/home/class-types/trampoline-fitness.png";

const HOME_CLASS_IMAGES: Record<string, string> = {
  "aerial fitness": aerialFitnessImg,
  yoga: yogaImg,
  "aerial silk & hoop": aerialSilkHoopImg,
  "dance fitness": danceFitnessImg,
  "mat pilates": matPilatesImg,
  "functional training": functionalTrainingImg,
  "trampoline fitness": trampolineFitnessImg,
};

/**
 * Home Explore Classes carousel only — does not affect Book/Enroll pickers.
 * Returns undefined for Kids Aerial Fitness and unknown types so callers can
 * fall back to getClassTypeImageSrc or initials.
 */
export function getHomeClassTypeImageSrc(
  classTypeName: string,
): string | undefined {
  const n = normalizeClassTypeName(classTypeName);
  if (n === "kids aerial fitness") return undefined;
  return HOME_CLASS_IMAGES[n];
}
