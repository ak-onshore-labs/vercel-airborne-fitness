import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useMember } from "@/context/MemberContext";
import { Loader2, Check } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

export default function EnrollSuccess() {
  const { user } = useMember();
  const [, setLocation] = useLocation();
  const confettiFired = useRef(false);

  useEffect(() => {
    if (confettiFired.current || !user) return;
    confettiFired.current = true;
    const opts = { particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ["#0d9488", "#14b8a6", "#5eead4"] };
    confetti(opts);
    const t = setTimeout(() => confetti({ ...opts, particleCount: 40, startVelocity: 25 }), 200);
    return () => clearTimeout(t);
  }, [user]);

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  return (
    <MobileLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mb-8",
            "bg-airborne-teal/10 dark:bg-airborne-teal/20",
            "animate-in zoom-in-50 duration-500"
          )}
          aria-hidden
        >
          <Check className="w-10 h-10 text-airborne-teal stroke-[2.5]" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">You&apos;re in!</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed max-w-sm mb-10">
          This was the easy part—staying consistent is the real goal.
          <br />
          <span className="text-airborne-deep font-semibold text-gray-900 dark:text-gray-100">Welcome to Airborne.</span>
        </p>
        <Button
          onClick={() => setLocation("/book")}
          className="w-full max-w-xs h-12 bg-airborne-teal hover:bg-airborne-deep text-white font-semibold rounded-xl shadow-lg shadow-teal-100 dark:shadow-teal-900/30"
          data-testid="button-book-first-class"
        >
          Book Your First Class
        </Button>
      </div>
    </MobileLayout>
  );
}
