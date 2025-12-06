import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { CLASSES, MEMBERSHIP_PLANS, MembershipPlan } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Step components
const PersonalDetails = ({ onNext, data, onChange }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
    <h2 className="text-xl font-bold mb-4">Personal Details</h2>
    <div className="space-y-3">
      <Input data-testid="input-name" placeholder="Full Name" value={data.name} onChange={e => onChange('name', e.target.value)} className="bg-airborne-surface border-white/10" />
      <Input data-testid="input-email" placeholder="Email Address" type="email" value={data.email} onChange={e => onChange('email', e.target.value)} className="bg-airborne-surface border-white/10" />
      <Input data-testid="input-dob" placeholder="Date of Birth" type="date" className="bg-airborne-surface border-white/10" />
      <Input data-testid="input-emergency-contact" placeholder="Emergency Contact Name" className="bg-airborne-surface border-white/10" />
      <Input data-testid="input-emergency-phone" placeholder="Emergency Contact Number" type="tel" className="bg-airborne-surface border-white/10" />
      <Textarea data-testid="input-medical" placeholder="Any medical conditions or injuries?" className="bg-airborne-surface border-white/10" />
    </div>
    <Button onClick={onNext} className="w-full mt-6 bg-airborne-teal hover:bg-airborne-aqua text-white" data-testid="button-next-1">Next: Membership</Button>
  </motion.div>
);

const MembershipSelection = ({ onNext, onBack, onSelectPlan, selectedPlan }: any) => {
  const [selectedCategory, setSelectedCategory] = useState(CLASSES[0].name);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Choose a Plan</h2>
      
      {/* Category Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
        {CLASSES.map(cls => (
          <button
            key={cls.id}
            onClick={() => setSelectedCategory(cls.name)}
            data-testid={`button-category-${cls.id}`}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              selectedCategory === cls.name
                ? "bg-white text-black border-white"
                : "bg-airborne-surface text-gray-400 border-white/10"
            )}
          >
            {cls.name}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(MEMBERSHIP_PLANS[selectedCategory] || MEMBERSHIP_PLANS['default']).map((plan: MembershipPlan) => (
          <div 
            key={plan.id}
            onClick={() => onSelectPlan(plan)}
            data-testid={`card-plan-${plan.id}`}
            className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center",
              selectedPlan?.id === plan.id
                ? "bg-airborne-teal/10 border-airborne-teal"
                : "bg-airborne-surface border-white/5 hover:border-white/20"
            )}
          >
            <div>
              <h3 className="font-semibold text-white">{plan.name}</h3>
              <p className="text-xs text-gray-400">{plan.sessions} sessions • Valid {plan.validityDays} days</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg">₹{plan.price.toLocaleString()}</span>
              <div className={cn(
                "w-5 h-5 rounded-full border flex items-center justify-center",
                selectedPlan?.id === plan.id ? "bg-airborne-teal border-airborne-teal" : "border-gray-600"
              )}>
                {selectedPlan?.id === plan.id && <Check size={12} className="text-white" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 border-white/10 text-white" data-testid="button-back-2">Back</Button>
        <Button onClick={onNext} disabled={!selectedPlan} className="flex-1 bg-airborne-teal hover:bg-airborne-aqua text-white" data-testid="button-next-2">Next: Waiver</Button>
      </div>
    </motion.div>
  );
};

const Waiver = ({ onNext, onBack }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
    <h2 className="text-xl font-bold mb-4">Liability Waiver</h2>
    <div className="h-60 overflow-y-auto bg-airborne-surface border border-white/5 p-4 rounded-lg text-xs text-gray-400 leading-relaxed">
      <p className="mb-2">I hereby agree to the following:</p>
      <p className="mb-2">1. That I am participating in the Exercise Classes, Health Programs or Workshops offered by Airborne Fitness during which I will receive information and instruction about Aerial Fitness, Pilates, and other activities. I recognize that exercise requires physical exertion that may be strenuous and may cause physical injury, and I am fully aware of the risks and hazards involved.</p>
      <p className="mb-2">2. I understand that it is my responsibility to consult with a physician prior to and regarding my participation in the Exercise Classes, Health Programs or Workshops. I represent and warrant that I am physically fit and I have no medical condition that would prevent my full participation in the Exercise Classes, Health Programs or Workshops.</p>
      <p>3. In consideration of being permitted to participate in the Exercise Classes, Health Programs or Workshops, I agree to assume full responsibility for any risks, injuries or damages, known or unknown, which I might incur as a result of participating in the program.</p>
    </div>
    
    <div className="space-y-3 pt-2">
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1 rounded bg-airborne-surface border-white/20" data-testid="checkbox-waiver-agree" />
        <span className="text-xs text-gray-300">I have read and agree to the waiver terms and conditions.</span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1 rounded bg-airborne-surface border-white/20" data-testid="checkbox-age-confirm" />
        <span className="text-xs text-gray-300">I am 18 years of age or older.</span>
      </label>
      <Input placeholder="Type Full Name to Sign" className="bg-airborne-surface border-white/10 mt-2" data-testid="input-signature" />
    </div>

    <div className="flex gap-3 mt-6">
      <Button variant="outline" onClick={onBack} className="flex-1 border-white/10 text-white" data-testid="button-back-3">Back</Button>
      <Button onClick={onNext} className="flex-1 bg-airborne-teal hover:bg-airborne-aqua text-white" data-testid="button-next-3">Next: Payment</Button>
    </div>
  </motion.div>
);

const Payment = ({ onBack, onComplete, plan, loading }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
    <h2 className="text-xl font-bold mb-4">Payment Summary</h2>
    
    <div className="bg-airborne-surface border border-white/5 p-6 rounded-2xl">
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="font-semibold text-white">{plan.name}</h3>
          <p className="text-xs text-gray-400">{plan.sessions} Sessions</p>
        </div>
        <span className="text-xl font-bold">₹{plan.price.toLocaleString()}</span>
      </div>
      <div className="space-y-2 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{plan.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>GST (18%)</span>
          <span>₹{(plan.price * 0.18).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-white font-bold pt-2 border-t border-white/5 mt-2">
          <span>Total</span>
          <span>₹{(plan.price * 1.18).toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      <Button 
        onClick={onComplete} 
        disabled={loading}
        className="w-full h-12 bg-airborne-teal hover:bg-airborne-aqua text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(4,192,193,0.3)]"
        data-testid="button-pay-razorpay"
      >
        {loading ? "Processing..." : "Pay Securely with Razorpay"}
      </Button>
      <Button variant="ghost" onClick={onBack} className="w-full text-gray-400 hover:text-white" data-testid="button-cancel-payment">Cancel</Button>
    </div>
  </motion.div>
);

export default function Enroll() {
  const { enroll, user } = useMember();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: user?.name || "", email: "" });
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedPlan) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate Razorpay
    enroll(formData, selectedPlan);
    setIsLoading(false);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-airborne-bg text-white">
      <div className="max-w-md mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
           {step > 1 && (
             <button onClick={() => setStep(s => s - 1)} className="text-gray-400 hover:text-white" data-testid="button-step-back">
               <ArrowLeft size={20} />
             </button>
           )}
           <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
             <div 
               className="h-full bg-airborne-teal transition-all duration-300"
               style={{ width: `${(step / 4) * 100}%` }}
             />
           </div>
           <span className="text-xs text-gray-400">Step {step}/4</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <PersonalDetails 
              key="step1" 
              data={formData} 
              onChange={(k: string, v: string) => setFormData(p => ({...p, [k]: v}))}
              onNext={() => setStep(2)} 
            />
          )}
          {step === 2 && (
            <MembershipSelection 
              key="step2" 
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
              onBack={() => setStep(1)} 
              onNext={() => setStep(3)} 
            />
          )}
          {step === 3 && (
            <Waiver 
              key="step3" 
              onBack={() => setStep(2)} 
              onNext={() => setStep(4)} 
            />
          )}
          {step === 4 && (
            <Payment 
              key="step4" 
              plan={selectedPlan}
              loading={isLoading}
              onBack={() => setStep(3)} 
              onComplete={handleComplete} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
