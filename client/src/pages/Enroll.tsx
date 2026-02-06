import { useState } from "react";
import { useMember, SelectedPlan } from "@/context/MemberContext";
import { CLASSES, MEMBERSHIP_PLANS, MembershipPlan } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/layout/MobileLayout";

const PersonalDetails = ({ onNext, data, onChange }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
    <h2 className="text-2xl font-bold text-gray-900">About You</h2>
    <div className="space-y-4">
      <Input placeholder="Full Name" value={data.name} onChange={e => onChange('name', e.target.value)} className="h-12 rounded" />
      <Input placeholder="Email" type="email" value={data.email} onChange={e => onChange('email', e.target.value)} className="h-12 rounded" />
      <Input placeholder="Date of Birth" type="date" className="h-12 rounded" />
    </div>
    <Button onClick={onNext} className="w-full h-12 bg-airborne-teal text-white rounded">Continue</Button>
  </motion.div>
);

const MembershipSelection = ({ onNext, onBack, onAddPlan, onRemovePlan, selectedPlans }: any) => {
  const [activeTab, setActiveTab] = useState(CLASSES[0].name);
  const [, setLocation] = useLocation();
  const currentPlan = selectedPlans.find((p: any) => p.category === activeTab);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Select Plans</h2>
        <Button variant="outline" size="sm" onClick={() => setLocation('/book?from=enroll')} className="text-airborne-teal border-airborne-teal">
          <Calendar size={14} className="mr-1" /> View Schedule
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {CLASSES.map(cls => (
          <button key={cls.id} onClick={() => setActiveTab(cls.name)} className={cn("flex-shrink-0 px-4 py-3 rounded text-sm font-medium border", activeTab === cls.name ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200")}>{cls.name}</button>
        ))}
      </div>
      <div className="space-y-3">
        {(MEMBERSHIP_PLANS[activeTab] || MEMBERSHIP_PLANS['default']).map((plan: MembershipPlan) => (
          <div key={plan.id} onClick={() => onAddPlan(activeTab, plan)} className={cn("p-5 rounded border cursor-pointer", currentPlan?.plan.id === plan.id ? "bg-teal-50 border-airborne-teal" : "bg-white border-gray-100")}>
            <div className="flex justify-between items-center">
              <div><h3 className="font-bold text-gray-900">{plan.name}</h3><p className="text-xs text-gray-500">{plan.sessions} sessions</p></div>
              <span className="font-bold text-gray-900">₹{plan.price.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onNext} disabled={selectedPlans.length === 0} className="w-full h-12 bg-airborne-teal text-white rounded">Continue</Button>
      <Button variant="ghost" onClick={onBack} className="w-full">Back</Button>
    </motion.div>
  );
};

const KidDetails = ({ onNext, onBack, data, onChange }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
    <h2 className="text-2xl font-bold text-gray-900">Kid's Details</h2>
    <div className="space-y-4">
      <Input placeholder="Kid's Name" value={data.name} onChange={e => onChange('name', e.target.value)} className="h-12 rounded" />
      <Input placeholder="Kid's Date of Birth" type="date" value={data.dob} onChange={e => onChange('dob', e.target.value)} className="h-12 rounded" />
      <select value={data.gender} onChange={e => onChange('gender', e.target.value)} className="w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded outline-none focus:ring-1 focus:ring-airborne-teal">
        <option value="">Select Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
        <option value="Prefer not to say">Prefer not to say</option>
      </select>
    </div>
    <Button onClick={onNext} className="w-full h-12 bg-airborne-teal text-white rounded">Continue</Button>
    <Button variant="ghost" onClick={onBack} className="w-full">Back</Button>
  </motion.div>
);

const Waiver = ({ onNext, onBack }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
    <h2 className="text-2xl font-bold text-gray-900">Waiver</h2>
    <div className="h-64 overflow-y-auto bg-gray-50 border p-4 rounded text-xs text-gray-500">Liability Waiver Content...</div>
    <Button onClick={onNext} className="w-full h-12 bg-airborne-teal text-white rounded">Agree & Continue</Button>
    <Button variant="ghost" onClick={onBack} className="w-full">Back</Button>
  </motion.div>
);

const Payment = ({ onBack, onComplete, plans, loading }: any) => {
  const total = plans.reduce((sum: number, item: any) => sum + item.plan.price, 0) * 1.18;
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
        <div className="bg-white border p-6 rounded shadow-sm">
            {plans.map((item: any) => (
                <div key={item.category} className="flex justify-between mb-2">
                  <span className="text-sm">{item.category}</span>
                  <span className="font-bold text-sm">₹{item.plan.price.toLocaleString()}</span>
                </div>
            ))}
            <div className="border-t pt-2 mt-2 font-bold flex justify-between text-airborne-teal text-lg">
              <span>Total (+GST)</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
        </div>
        <Button onClick={onComplete} disabled={loading} className="w-full h-14 bg-gray-900 text-white font-bold rounded">
            {loading ? "Processing..." : "Pay Securely"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full">Back</Button>
    </motion.div>
  );
};

export default function Enroll() {
  const { enroll, user } = useMember();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: user?.name || "", email: "" });
  const [kidDetails, setKidDetails] = useState({ name: "", dob: "", gender: "" });
  const [selectedPlans, setSelectedPlans] = useState<SelectedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hasKidsCategory = selectedPlans.some(p => p.category.toLowerCase().includes('kids'));

  const nextStep = () => {
    if (step === 2 && !hasKidsCategory) setStep(4);
    else setStep(step + 1);
  };

  const prevStep = () => {
    if (step === 4 && !hasKidsCategory) setStep(2);
    else setStep(step - 1);
  };

  const handleAddPlan = (category: string, plan: MembershipPlan) => {
    setSelectedPlans(prev => [...prev.filter(p => p.category !== category), { category, plan }]);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    enroll({ ...formData, kidDetails: hasKidsCategory ? kidDetails : null }, selectedPlans);
    setIsLoading(false);
    setLocation("/dashboard");
  };

  return (
    <MobileLayout>
        <div className="p-6">
            <div className="flex gap-2 mb-8">
                {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={cn("h-1 flex-1 rounded transition-colors", s <= step ? "bg-airborne-teal" : "bg-gray-200")} />
                ))}
            </div>
            <AnimatePresence mode="wait">
              {step === 1 && <PersonalDetails onNext={() => setStep(2)} data={formData} onChange={(k: any, v: any) => setFormData(p => ({...p, [k]: v}))} />}
              {step === 2 && <MembershipSelection onNext={nextStep} onBack={() => setStep(1)} selectedPlans={selectedPlans} onAddPlan={handleAddPlan} onRemovePlan={(c: string) => setSelectedPlans(p => p.filter(x => x.category !== c))} />}
              {step === 3 && <KidDetails onNext={() => setStep(4)} onBack={() => setStep(2)} data={kidDetails} onChange={(k: any, v: any) => setKidDetails(p => ({...p, [k]: v}))} />}
              {step === 4 && <Waiver onNext={() => setStep(5)} onBack={prevStep} />}
              {step === 5 && <Payment onBack={() => setStep(4)} onComplete={handleComplete} plans={selectedPlans} loading={isLoading} />}
            </AnimatePresence>
        </div>
    </MobileLayout>
  );
}
