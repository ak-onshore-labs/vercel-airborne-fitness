import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import logo from "@assets/image_1765019094396.png";

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
    await new Promise(resolve => setTimeout(resolve, 800)); 
    setIsLoading(false);
    setStep("otp");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;
    setIsLoading(true);
    
    const success = await login(phone);
    setIsLoading(false);
    
    if (success) {
      if (phone === '9999988888') {
        setLocation("/enroll");
      } else {
        setLocation("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        {/* Logo Area */}
        <div className="mb-10 w-full flex justify-center">
           <img src={logo} alt="Airborne Aerial Fitness" className="h-24 object-contain" />
        </div>

        <div className="w-full bg-white p-8 rounded shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome</h2>
          <p className="text-gray-500 text-center text-sm mb-8">
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
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center justify-center px-3 bg-gray-50 rounded border border-gray-200 text-gray-500 text-sm font-medium">
                      +91
                    </div>
                    <Input 
                      data-testid="input-phone"
                      type="tel" 
                      placeholder="99999 99999" 
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-airborne-teal rounded"
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
                
                <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-medium text-center">
                    Demo Logins:<br/>
                    New Member: 99999 88888<br/>
                    Existing Member: 99999 77777
                  </p>
                </div>
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
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Enter OTP</label>
                    <button 
                      type="button" 
                      onClick={() => setStep("phone")}
                      className="text-xs text-airborne-teal font-medium hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <Input 
                    data-testid="input-otp"
                    type="text" 
                    placeholder="• • • •" 
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-300 focus-visible:ring-airborne-teal text-center tracking-[1em] text-lg rounded-xl"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-center text-gray-400">Use 123456 for demo</p>
                </div>
                <Button 
                  data-testid="button-verify-otp"
                  type="submit" 
                  className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white font-semibold rounded-xl shadow-md shadow-airborne-teal/20 transition-all group mt-2"
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
      </motion.div>
    </div>
  );
}
