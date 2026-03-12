import { BrandAccent } from "@/components/BrandAccent";

/**
 * Top hero row: left = page heading/intro, right = decorative GIF accent.
 * Used only on /dashboard, /sessions, /profile. Rest of page content stays full width below.
 */
export function HeroWithAccent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["flex items-start justify-between gap-4 mb-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <BrandAccent />
    </div>
  );
}
