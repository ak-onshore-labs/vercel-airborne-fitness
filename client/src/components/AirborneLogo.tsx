import { useTheme } from "@/context/ThemeContext";

import logoLight from "@/assets/brand/logo-light.png";
import logoDark from "@/assets/brand/logo-dark.png";

interface AirborneLogoProps {
  className?: string;
  alt?: string;
}

export function AirborneLogo({ className, alt = "Airborne" }: AirborneLogoProps) {
  const { darkMode } = useTheme();
  const src = darkMode ? logoDark : logoLight;
  return <img key={String(darkMode)} src={src} alt={alt} className={className} />;
}
