import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import bgImage from "@assets/generated_images/cinematic_aerial_silks_fitness_studio_dark_moody.png";

export default function Login() {
  const { login } = useMember();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate net
    setIsLoading(false);
    setStep("otp");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;
    setIsLoading(true);
    await login(phone);
    setIsLoading(false);
    setLocation("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-airborne-bg text-white">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-airborne-bg/60 via-airborne-bg/80 to-airborne-bg" />

      <div className="relative z-10 w-full max-w-sm px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Airborne<span className="text-airborne-teal">.</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Elevate your fitness journey.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.form
              key="phone-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="flex items-center justify-center px-3 bg-airborne-surface rounded-lg border border-white/10 text-gray-400 text-sm">
                    +91
                  </div>
                  <Input 
                    data-testid="input-phone"
                    type="tel" 
                    placeholder="98765 43210" 
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="h-12 bg-airborne-surface border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-airborne-teal"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
              <Button 
                data-testid="button-get-otp"
                type="submit" 
                className="w-full h-12 bg-airborne-teal hover:bg-airborne-aqua text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(4,192,193,0.3)] transition-all"
                disabled={isLoading || phone.length < 10}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : "Get OTP"}
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-4"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Enter OTP</label>
                  <button 
                    type="button" 
                    onClick={() => setStep("phone")}
                    className="text-xs text-airborne-teal hover:text-airborne-aqua"
                  >
                    Change Number
                  </button>
                </div>
                <Input 
                  data-testid="input-otp"
                  type="text" 
                  placeholder="1 2 3 4" 
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-12 bg-airborne-surface border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-airborne-teal text-center tracking-[1em] text-lg"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-center text-gray-500">Use 123456 for demo</p>
              </div>
              <Button 
                data-testid="button-verify-otp"
                type="submit" 
                className="w-full h-12 bg-airborne-teal hover:bg-airborne-aqua text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(4,192,193,0.3)] transition-all group"
                disabled={isLoading || otp.length < 4}
              >
                {isLoading ? <Loader2 className="animate-spin" /> : (
                  <span className="flex items-center gap-2">
                    Verify & Continue <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
