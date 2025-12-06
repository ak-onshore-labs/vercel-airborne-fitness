import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { CLASSES, MEMBERSHIP_PLANS, MembershipPlan, ClassCategory } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/layout/MobileLayout";

// Step components
const PersonalDetails = ({ onNext, data, onChange }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
    <div>
        <h2 className="text-2xl font-bold text-gray-900">About You</h2>
        <p className="text-gray-500 text-sm">Let's get to know you better.</p>
    </div>
    
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase">Full Name</label>
        <Input data-testid="input-name" placeholder="Jane Doe" value={data.name} onChange={e => onChange('name', e.target.value)} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus-visible:ring-airborne-teal" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
        <Input data-testid="input-email" placeholder="jane@example.com" type="email" value={data.email} onChange={e => onChange('email', e.target.value)} className="bg-gray-50 border-gray-200 h-12 rounded-xl focus-visible:ring-airborne-teal" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase">Date of Birth</label>
        <Input data-testid="input-dob" placeholder="Date of Birth" type="date" className="bg-gray-50 border-gray-200 h-12 rounded-xl focus-visible:ring-airborne-teal" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase">Emergency Contact</label>
        <Input data-testid="input-emergency-contact" placeholder="Contact Name" className="bg-gray-50 border-gray-200 h-12 rounded-xl focus-visible:ring-airborne-teal mb-2" />
        <Input data-testid="input-emergency-phone" placeholder="Contact Number" type="tel" className="bg-gray-50 border-gray-200 h-12 rounded-xl focus-visible:ring-airborne-teal" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase">Medical Conditions</label>
        <Textarea data-testid="input-medical" placeholder="Any injuries or conditions we should know?" className="bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-airborne-teal min-h-[100px]" />
      </div>
    </div>
    <Button onClick={onNext} className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded-xl shadow-lg shadow-teal-100 mt-4" data-testid="button-next-1">
        Continue
    </Button>
  </motion.div>
);

const MembershipSelection = ({ onNext, onBack, onSelectPlan, selectedPlan, onSelectCategory, selectedCategory }: any) => {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Select Plan</h2>
        <p className="text-gray-500 text-sm">Choose a class category and membership.</p>
      </div>
      
      {/* Category Horizontal Scroll */}
      <div className="space-y-2">
         <label className="text-xs font-medium text-gray-500 uppercase">Class Category</label>
         <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {CLASSES.map(cls => (
            <button
                key={cls.id}
                onClick={() => onSelectCategory(cls.name)}
                data-testid={`button-category-${cls.id}`}
                className={cn(
                "flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                selectedCategory === cls.name
                    ? "bg-airborne-teal text-white border-airborne-teal shadow-md shadow-teal-100"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}
            >
                {cls.name}
            </button>
            ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-medium text-gray-500 uppercase">Available Plans</label>
        {(MEMBERSHIP_PLANS[selectedCategory] || MEMBERSHIP_PLANS['default']).map((plan: MembershipPlan) => (
          <div 
            key={plan.id}
            onClick={() => onSelectPlan(plan)}
            data-testid={`card-plan-${plan.id}`}
            className={cn(
              "p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center group",
              selectedPlan?.id === plan.id
                ? "bg-teal-50 border-airborne-teal ring-1 ring-airborne-teal"
                : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
            )}
          >
            <div>
              <h3 className={cn("font-bold text-base", selectedPlan?.id === plan.id ? "text-airborne-teal" : "text-gray-900")}>{plan.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{plan.sessions} sessions • Valid {plan.validityDays} days</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-lg text-gray-900 block">₹{plan.price.toLocaleString()}</span>
              {selectedPlan?.id === plan.id && (
                  <span className="text-[10px] font-bold text-airborne-teal uppercase tracking-wider">Selected</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 border-gray-200 text-gray-600 rounded-xl" data-testid="button-back-2">Back</Button>
        <Button onClick={onNext} disabled={!selectedPlan} className="flex-1 h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded-xl shadow-lg shadow-teal-100" data-testid="button-next-2">Continue</Button>
      </div>
    </motion.div>
  );
};

const Waiver = ({ onNext, onBack }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
    <div>
        <h2 className="text-2xl font-bold text-gray-900">Waiver</h2>
        <p className="text-gray-500 text-sm">Please review and sign.</p>
    </div>

    <div className="h-64 overflow-y-auto bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs text-gray-500 leading-relaxed">
      <p className="mb-3 font-bold text-gray-700">LIABILITY WAIVER AND RELEASE</p>
      <p className="mb-2">1. I acknowledge that I am voluntarily participating in the activities offered by Airborne Fitness.</p>
      <p className="mb-2">2. I recognize that these activities involve physical exertion and potential risks of injury.</p>
      <p className="mb-2">3. I hereby release, waive, discharge, and covenant not to sue Airborne Fitness, its owners, instructors, and agents from any and all liability.</p>
      <p className="mb-2">4. I certify that I am physically fit and have not been advised to the contrary by a qualified medical professional.</p>
    </div>
    
    <div className="space-y-4 pt-2">
      <label className="flex items-start gap-3 cursor-pointer bg-white p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
        <input type="checkbox" className="mt-1 rounded border-gray-300 text-airborne-teal focus:ring-airborne-teal" data-testid="checkbox-waiver-agree" />
        <span className="text-xs text-gray-600 font-medium">I have read and agree to the waiver terms.</span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer bg-white p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
        <input type="checkbox" className="mt-1 rounded border-gray-300 text-airborne-teal focus:ring-airborne-teal" data-testid="checkbox-age-confirm" />
        <span className="text-xs text-gray-600 font-medium">I am 18 years of age or older.</span>
      </label>
      
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 uppercase">Digital Signature</label>
        <Input placeholder="Type Full Name" className="bg-gray-50 border-gray-200 h-12 rounded-xl focus-visible:ring-airborne-teal" data-testid="input-signature" />
      </div>
    </div>

    <div className="flex gap-3 mt-6">
      <Button variant="outline" onClick={onBack} className="flex-1 h-12 border-gray-200 text-gray-600 rounded-xl" data-testid="button-back-3">Back</Button>
      <Button onClick={onNext} className="flex-1 h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded-xl shadow-lg shadow-teal-100" data-testid="button-next-3">To Payment</Button>
    </div>
  </motion.div>
);

const Payment = ({ onBack, onComplete, plan, loading }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
    <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
        <p className="text-gray-500 text-sm">Secure checkout.</p>
    </div>
    
    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
          <p className="text-xs text-gray-500">{plan.sessions} Sessions</p>
        </div>
        <span className="text-2xl font-bold text-airborne-teal">₹{plan.price.toLocaleString()}</span>
      </div>
      <div className="space-y-3 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{plan.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>GST (18%)</span>
          <span>₹{(plan.price * 0.18).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-900 font-bold pt-4 border-t border-gray-100 mt-2">
          <span>Total Amount</span>
          <span>₹{(plan.price * 1.18).toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      <Button 
        onClick={onComplete} 
        disabled={loading}
        className="w-full h-14 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all"
        data-testid="button-pay-razorpay"
      >
        {loading ? "Processing..." : "Pay Securely"}
      </Button>
      <Button variant="ghost" onClick={onBack} className="w-full text-gray-400 hover:text-gray-600" data-testid="button-cancel-payment">Cancel Transaction</Button>
    </div>
  </motion.div>
);

export default function Enroll() {
  const { enroll, user } = useMember();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: user?.name || "", email: "" });
  const [selectedCategory, setSelectedCategory] = useState(CLASSES[0].name);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedPlan) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    enroll(formData, selectedPlan, selectedCategory);
    
    setIsLoading(false);
    setLocation("/dashboard");
  };

  return (
    <MobileLayout>
        <div className="p-6">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", s <= step ? "bg-airborne-teal" : "bg-gray-200")} />
                ))}
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
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
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
    </MobileLayout>
  );
}
