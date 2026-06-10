import { useState, useEffect, useRef } from "react";
import { useMember, type VerifyOtpPayload } from "@/context/MemberContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { AirborneLogo } from "@/components/AirborneLogo";
import { cn } from "@/lib/utils";

const LOGIN_ROOT_BASE =
  "min-h-svh w-full overflow-y-auto flex flex-col items-center bg-[#F9FAFB] dark:bg-[#0B0B0C] px-6";

const loginRootClassName = (keyboardMode: boolean) =>
  cn(
    LOGIN_ROOT_BASE,
    keyboardMode
      ? "overscroll-y-contain py-8 pb-28"
      : "justify-center min-h-screen sm:min-h-svh"
  );

const LOGIN_ROOT_LOADING_CLASS = cn(
  LOGIN_ROOT_BASE,
  "justify-center min-h-screen sm:min-h-svh"
);

const scrollInputIntoView = (el: HTMLInputElement | null) => {
  if (!el) return;
  window.setTimeout(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 300);
};

const KEYBOARD_BLUR_DELAY_MS = 150;

export default function Login() {
  const { loginWithPayload, user, sessionRestored } = useMember();
  const [, setLocation] = useLocation();
  const prevAuth = useRef({ sessionRestored: false, user: null as typeof user });
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const keyboardBlurTimeoutRef = useRef<number | null>(null);
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);

  const handleInputFocus = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (keyboardBlurTimeoutRef.current) {
      clearTimeout(keyboardBlurTimeoutRef.current);
      keyboardBlurTimeoutRef.current = null;
    }
    setKeyboardMode(true);
    scrollInputIntoView(inputRef.current);
  };

  const handleInputBlur = () => {
    keyboardBlurTimeoutRef.current = window.setTimeout(() => {
      setKeyboardMode(false);
      keyboardBlurTimeoutRef.current = null;
    }, KEYBOARD_BLUR_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (keyboardBlurTimeoutRef.current) {
        clearTimeout(keyboardBlurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const wasWaitingOnBootstrap = !prevAuth.current.sessionRestored;
    const hasSession = sessionRestored && !!user;
    if (wasWaitingOnBootstrap && hasSession) {
      setLocation("/dashboard");
    }
    prevAuth.current = { sessionRestored, user };
  }, [sessionRestored, user, setLocation]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    setIsLoading(true);
    const res = await apiFetch<{ success: boolean }>("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone: `+91${phone}` }),
    });
    setIsLoading(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Send OTP failed", description: res.message });
      return;
    }
    setStep("otp");
    toast({ title: "OTP sent to your number" });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) return;
    setIsLoading(true);
    const res = await apiFetch<{
      success: boolean;
      token: string;
      user: VerifyOtpPayload["user"];
      members: VerifyOtpPayload["members"];
      memberships: VerifyOtpPayload["memberships"];
      isNew: boolean;
      hasSignedWaiver?: boolean;
    }>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone: `+91${phone}`, code: otp }),
    });
    if (!res.ok) {
      setIsLoading(false);
      toast({ variant: "destructive", title: "Verification failed", description: res.message });
      return;
    }
    const { success } = await loginWithPayload({
      token: res.data!.token,
      user: res.data!.user,
      members: res.data!.members,
      memberships: res.data!.memberships,
      isNew: res.data!.isNew,
      hasSignedWaiver: res.data!.hasSignedWaiver,
    });
    setIsLoading(false);
    if (success) {
      setLocation("/dashboard");
    }
  };

  if (!sessionRestored) {
    return (
      <div className={LOGIN_ROOT_LOADING_CLASS}>
        <Loader2 className="h-8 w-8 animate-spin text-airborne-teal" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className={loginRootClassName(keyboardMode)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        <div className="mb-10 w-full flex justify-center">
          <AirborneLogo className="h-24 object-contain" alt="Airborne Aerial Fitness" />
        </div>

        <div className="w-full bg-white dark:bg-[#111113] p-8 rounded shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-white/6 border-l-2 border-l-airborne-teal dark:border-l-teal-400">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED] mb-2 text-center">Welcome</h2>
          <p className="text-gray-500 dark:text-[#9CA3AF] text-center text-sm mb-8">
            {step === 'phone' ? 'Enter your mobile number to continue' : 'Enter the verification code sent to your phone'}
          </p>

          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.form
                key="phone-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSendOtp}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-gray-50 dark:bg-[#18181B] rounded border border-gray-200 dark:border-white/6 text-gray-500 dark:text-[#9CA3AF] text-sm font-medium">
                      +91
                    </div>
                    <Input 
                      ref={phoneInputRef}
                      data-testid="input-phone"
                      type="tel" 
                      placeholder="99999 99999" 
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      onFocus={() => handleInputFocus(phoneInputRef)}
                      onBlur={handleInputBlur}
                      className="h-12 bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] focus-visible:ring-airborne-teal rounded"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
                <Button 
                  data-testid="button-get-otp"
                  type="submit" 
                  className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white font-semibold rounded shadow-md shadow-airborne-teal/20 transition-all mt-2"
                  disabled={isLoading || phone.length < 10}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Get OTP"}
                </Button>
                
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">Enter OTP</label>
                    <button 
                      type="button" 
                      onClick={() => setStep("phone")}
                      className="text-xs text-airborne-teal font-medium hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <Input 
                    ref={otpInputRef}
                    data-testid="input-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="• • • •" 
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onFocus={() => handleInputFocus(otpInputRef)}
                    onBlur={handleInputBlur}
                    className="h-12 bg-gray-50 dark:bg-[#18181B] border-gray-200 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-300 dark:placeholder:text-[#6B7280] focus-visible:ring-airborne-teal text-center tracking-[1em] text-lg rounded"
                    maxLength={4}
                    required
                  />
                  <p className="text-xs text-center text-gray-400 dark:text-[#6B7280]">Enter the 4-digit code sent via SMS</p>
                </div>
                <Button 
                  data-testid="button-verify-otp"
                  type="submit" 
                  className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white font-semibold rounded shadow-md shadow-airborne-teal/20 transition-all group mt-2"
                  disabled={isLoading || otp.length !== 4}
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
      </motion.div>
    </div>
  );
}
