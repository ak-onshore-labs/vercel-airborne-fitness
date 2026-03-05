import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useMember } from "@/context/MemberContext";
import { Loader2 } from "lucide-react";

export default function EnrollSuccess() {
  const { user } = useMember();
  const [, setLocation] = useLocation();

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  return (
    <MobileLayout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-700 text-lg leading-relaxed max-w-sm mb-10 font-medium">
          This was the easy part, staying consistent is the real goal 💪
          <br />
          <span className="text-airborne-deep font-semibold">Welcome to Airborne!</span>
        </p>
        <Button
          onClick={() => setLocation("/book")}
          className="w-full max-w-xs h-12 bg-airborne-teal hover:bg-airborne-deep text-white font-semibold rounded-xl shadow-lg"
          data-testid="button-book-first-class"
        >
          Book Your First Class
        </Button>
      </div>
    </MobileLayout>
  );
}
