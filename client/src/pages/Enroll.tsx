import { useState, useEffect, useRef } from "react";
import { useMember, SelectedPlan } from "@/context/MemberContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, Calendar, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileLayout from "@/components/layout/MobileLayout";
import { apiFetch } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import filledBicep from "@assets/filled_bicep.svg";
import blackBicep from "@assets/black_bicep.svg";

interface ClassType {
  id: string;
  name: string;
  ageGroup?: string;
  strengthLevel: number;
  descriptionPoints?: string[];
  isActive: boolean;
}

interface MembershipPlan {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validityDays?: number;
}

function StrengthIcons({ level }: { level: number }) {
  const filledCount = Math.min(5, Math.max(0, level));
  return (
    <div className="flex items-center gap-0.5" aria-label={`Strength level ${level} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <img
          key={i}
          src={i <= filledCount ? filledBicep : blackBicep}
          alt=""
          className="h-4 w-4 flex-shrink-0 object-contain"
          aria-hidden
        />
      ))}
    </div>
  );
}

const PERSONAL_DETAIL_FRIENDLY_MESSAGES: Record<string, string> = {
  name: "Please enter your name",
  email: "Please enter a valid email address",
  dob: "Please enter your date of birth",
  emergencyContactName: "Please enter emergency contact name",
  emergencyContactPhone: "Please enter emergency contact number",
};

function validatePersonalDetails(data: Record<string, string>): Record<string, string> {
  const err: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 2) err.name = PERSONAL_DETAIL_FRIENDLY_MESSAGES.name;
  if (!data.dob || !data.dob.trim()) err.dob = PERSONAL_DETAIL_FRIENDLY_MESSAGES.dob;
  else if (Number.isNaN(new Date(data.dob).getTime())) err.dob = PERSONAL_DETAIL_FRIENDLY_MESSAGES.dob;
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) err.email = PERSONAL_DETAIL_FRIENDLY_MESSAGES.email;
  if (!data.emergencyContactName || data.emergencyContactName.trim().length < 2) err.emergencyContactName = PERSONAL_DETAIL_FRIENDLY_MESSAGES.emergencyContactName;
  const phone = (data.emergencyContactPhone || "").replace(/\s/g, "");
  if (!/^\d{10}$/.test(phone)) err.emergencyContactPhone = PERSONAL_DETAIL_FRIENDLY_MESSAGES.emergencyContactPhone;
  return err;
}


function validateKidDetails(data: Record<string, string>): Record<string, string> {
  const err: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 2) err.name = "At least 2 characters required";
  if (!data.dob || !data.dob.trim()) err.dob = "Required";
  else if (Number.isNaN(new Date(data.dob).getTime())) err.dob = "Invalid date";
  if (!data.gender || !data.gender.trim()) err.gender = "Required";
  return err;
}

const PersonalDetails = ({ onNext, data, onChange }: any) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Clear error for a field as soon as it becomes valid (on change)
  useEffect(() => {
    setErrors((prev) => {
      const full = validatePersonalDetails(data);
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!full[key]) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data]);

  const handleBlur = (field: string) => {
    const full = validatePersonalDetails(data);
    const msg = full[field] ?? null;
    setErrors((prev) => {
      if (msg) return { ...prev, [field]: msg };
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleNext = () => {
    const e = validatePersonalDetails(data);
    setErrors(e);
    if (Object.keys(e).length === 0) onNext();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">About You</h2>
        <p className="text-gray-500 text-sm">Let's get to know you better.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Name *</label>
          <Input
            data-testid="input-name"
            placeholder="Jane Doe"
            value={data.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            className={cn("bg-gray-50 border-gray-100 h-12 rounded focus-visible:ring-airborne-teal", errors.name && "border-red-300")}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email *</label>
          <Input
            data-testid="input-email"
            placeholder="jane@example.com"
            type="email"
            value={data.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            className={cn("bg-gray-50 border-gray-100 h-12 rounded focus-visible:ring-airborne-teal", errors.email && "border-red-300")}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date of Birth *</label>
          <Input
            data-testid="input-dob"
            type="date"
            value={data.dob || ""}
            onChange={(e) => onChange("dob", e.target.value)}
            onBlur={() => handleBlur("dob")}
            className={cn("bg-gray-50 border-gray-100 h-12 rounded focus-visible:ring-airborne-teal", errors.dob && "border-red-300")}
          />
          {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Emergency Contact *</label>
          <div className="space-y-2">
            <Input
              data-testid="input-emergency-name"
              placeholder="Contact Name"
              value={data.emergencyContactName || ""}
              onChange={(e) => onChange("emergencyContactName", e.target.value)}
              onBlur={() => handleBlur("emergencyContactName")}
              className={cn("bg-gray-50 border-gray-100 h-12 rounded focus-visible:ring-airborne-teal", errors.emergencyContactName && "border-red-300")}
            />
            {errors.emergencyContactName && <p className="text-xs text-red-500">{errors.emergencyContactName}</p>}
            <Input
              data-testid="input-emergency-phone"
              placeholder="Contact Number"
              value={data.emergencyContactPhone || ""}
              onChange={(e) => onChange("emergencyContactPhone", e.target.value)}
              onBlur={() => handleBlur("emergencyContactPhone")}
              className={cn("bg-gray-50 border-gray-100 h-12 rounded focus-visible:ring-airborne-teal", errors.emergencyContactPhone && "border-red-300")}
            />
            {errors.emergencyContactPhone && <p className="text-xs text-red-500">{errors.emergencyContactPhone}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Medical Conditions</label>
          <Textarea data-testid="input-medical" placeholder="Any injuries or conditions we should know?" value={data.medicalConditions || ""} onChange={(e) => onChange("medicalConditions", e.target.value)} className="bg-gray-50 border-gray-100 rounded focus-visible:ring-airborne-teal min-h-[100px]" />
        </div>
      </div>
      <Button onClick={handleNext} className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded shadow-lg shadow-teal-100 mt-4" data-testid="button-next-1">
        Continue
      </Button>
    </motion.div>
  );
};

const MembershipSelection = ({ onNext, onBack, onAddPlan, onRemovePlan, selectedPlans, classTypes, plansByClassType, selectedClassType, onSelectClassType }: any) => {
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [infoClass, setInfoClass] = useState<ClassType | null>(null);
  const [, setLocation] = useLocation();
  const currentPlan = selectedPlans.find((p: any) => p.category === selectedClassType?.name);
  const currentPlans = selectedClassType ? (plansByClassType[selectedClassType.id] ?? []) : [];

  const openClassInfo = (cls: ClassType) => {
    setInfoClass(cls);
    setInfoSheetOpen(true);
  };

  const bullets = (infoClass?.descriptionPoints ?? []).length > 0 ? infoClass!.descriptionPoints! : [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Select Plans</h2>
        <Button variant="outline" size="sm" onClick={() => setLocation("/book?from=enroll")} className="text-airborne-teal border-airborne-teal" data-testid="button-view-schedule">
          <Calendar size={14} className="mr-1" /> View Schedule
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {classTypes.map((cls: ClassType) => (
          <button
            key={cls.id}
            type="button"
            onClick={() => onSelectClassType(cls)}
            className={cn(
              "flex-shrink-0 rounded border relative flex flex-col min-w-[120px] overflow-hidden p-3 text-left transition-colors",
              selectedClassType?.id === cls.id ? "bg-gray-900 border-gray-900" : selectedPlans.some((p: any) => p.category === cls.name) ? "bg-teal-50 border-airborne-teal" : "bg-white border-gray-200"
            )}
            data-testid={`button-category-${cls.id}`}
          >
            <span className={cn("text-sm font-medium", selectedClassType?.id === cls.id ? "text-white" : selectedPlans.some((p: any) => p.category === cls.name) ? "text-airborne-teal" : "text-gray-500")}>
              {cls.name}
            </span>
            {selectedPlans.some((p: any) => p.category === cls.name) && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-airborne-teal rounded-full border-2 border-white" />}
          </button>
        ))}
      </div>

      {selectedClassType && (
        <div className="rounded border border-gray-100 bg-gray-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Strength level</span>
            <StrengthIcons level={selectedClassType.strengthLevel ?? 1} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openClassInfo(selectedClassType)}
            className="w-full justify-center text-airborne-teal border-airborne-teal/50 hover:bg-teal-50"
            data-testid={`button-class-info-${selectedClassType.id}`}
          >
            <Info size={14} className="mr-1" /> Class info
          </Button>
        </div>
      )}

      <Sheet open={infoSheetOpen} onOpenChange={setInfoSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        >
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2 pr-12 border-b border-gray-100">
            <SheetTitle className="text-left text-lg">{infoClass?.name ?? "Class info"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {bullets.length > 0 ? (
              <ul className="space-y-2 pb-6">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-airborne-teal mt-0.5 shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 pb-6">No additional info for this class.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="space-y-3">
        {selectedClassType && currentPlans.map((plan: MembershipPlan) => (
          <div key={plan.id} onClick={() => onAddPlan(selectedClassType.name, plan)} data-testid={`card-plan-${plan.id}`} className={cn("p-5 rounded border cursor-pointer", currentPlan?.plan.id === plan.id ? "bg-teal-50 border-airborne-teal" : "bg-white border-gray-100")}>
            <div className="flex justify-between items-center">
              <div><h3 className="font-bold text-gray-900">{plan.name}</h3><p className="text-xs text-gray-500">{plan.sessions} sessions{plan.validityDays ? ` • Valid ${plan.validityDays} days` : ''}</p></div>
              <span className="font-bold text-gray-900">₹{plan.price.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      {selectedPlans.length === 0 && selectedClassType && (
        <p className="text-sm text-amber-600" data-testid="error-select-plan">Select at least one plan to continue.</p>
      )}

      {selectedPlans.length > 0 && (
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Selected ({selectedPlans.length})</h4>
          {selectedPlans.map((item: any) => (
            <div key={item.category} className="flex justify-between items-center text-sm mb-1">
              <span className="text-gray-900 font-medium">{item.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{item.plan.name}</span>
                <button onClick={() => onRemovePlan(item.category)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button onClick={onNext} disabled={selectedPlans.length === 0} className="w-full h-12 bg-airborne-teal text-white rounded" data-testid="button-next-2">Continue</Button>
      <Button variant="ghost" onClick={onBack} className="w-full" data-testid="button-back-2">Back</Button>
    </motion.div>
  );
};

const KidDetails = ({ onNext, onBack, data, onChange }: any) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleNext = () => {
    const e = validateKidDetails(data);
    setErrors(e);
    if (Object.keys(e).length === 0) onNext();
  };
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900">Kid's Details</h2>
      <p className="text-gray-500 text-sm">Required for kids class enrollment.</p>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kid's Name *</label>
          <Input data-testid="input-kid-name" placeholder="Kid's Name" value={data.name || ""} onChange={e => onChange("name", e.target.value)} className={cn("bg-gray-50 border-gray-100 h-12 rounded", errors.name && "border-red-300")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kid's Date of Birth *</label>
          <Input data-testid="input-kid-dob" type="date" value={data.dob || ""} onChange={e => onChange("dob", e.target.value)} className={cn("bg-gray-50 border-gray-100 h-12 rounded", errors.dob && "border-red-300")} />
          {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gender *</label>
          <select data-testid="select-kid-gender" value={data.gender || ""} onChange={e => onChange("gender", e.target.value)} className={cn("w-full h-12 px-3 bg-gray-50 border border-gray-100 rounded outline-none focus:ring-1 focus:ring-airborne-teal", errors.gender && "border-red-300")}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
        </div>
      </div>
      <Button onClick={handleNext} className="w-full h-12 bg-airborne-teal text-white rounded" data-testid="button-next-kid">Continue</Button>
      <Button variant="ghost" onClick={onBack} className="w-full" data-testid="button-back-kid">Back</Button>
    </motion.div>
  );
};

const Waiver = ({ onNext, onBack, data, onChange }: any) => {
  const waiverValid = data.agreedTerms === true && typeof data.signatureName === "string" && data.signatureName.trim().length >= 2;
  const [touched, setTouched] = useState(false);
  const handleNext = () => {
    if (!waiverValid) {
      setTouched(true);
      return;
    }
    onNext();
  };
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Waiver</h2>
        <p className="text-gray-500 text-sm">Please review and sign.</p>
      </div>

      <div className="bg-gray-50 border border-gray-100 p-6 rounded text-xs text-gray-500 leading-relaxed">
        <p className="mb-4 font-bold text-gray-700 uppercase tracking-tight">Liability Waiver and Release</p>
        <div className="space-y-3">
          <p>1. I acknowledge that I am voluntarily participating in the activities offered by Airborne Fitness.</p>
          <p>2. I recognize that these activities involve physical exertion and potential risks of injury.</p>
          <p>3. I hereby release, waive, discharge, and covenant not to sue Airborne Fitness, its owners, instructors, and agents from any and all liability.</p>
          <p>4. I certify that I am physically fit and have not been advised to the contrary by a qualified medical professional.</p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded cursor-pointer hover:border-gray-200 transition-colors">
          <input type="checkbox" checked={data.agreedTerms} onChange={e => onChange("agreedTerms", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-airborne-teal focus:ring-airborne-teal" data-testid="checkbox-waiver-agree" />
          <span className="text-sm text-gray-600">I have read and agree to the waiver terms. *</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded cursor-pointer hover:border-gray-200 transition-colors">
          <input type="checkbox" checked={data.agreedAge} onChange={e => onChange("agreedAge", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-airborne-teal focus:ring-airborne-teal" data-testid="checkbox-age-confirm" />
          <span className="text-sm text-gray-600">I am 18 years of age or older.</span>
        </label>

        <div className="space-y-1 pt-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Digital Signature (Full Name) *</label>
          <Input placeholder="Type Full Name" value={data.signatureName || ""} onChange={e => onChange("signatureName", e.target.value)} className={cn("bg-gray-50 border-gray-100 h-12 rounded focus-visible:ring-airborne-teal", touched && !waiverValid && !data.signatureName?.trim() && "border-red-300")} data-testid="input-signature" />
        </div>
      </div>
      {touched && !waiverValid && (
        <p className="text-sm text-amber-600">Agree to the waiver terms and enter your full name to continue.</p>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 border-gray-200 text-gray-600 rounded" data-testid="button-back-waiver">Back</Button>
        <Button onClick={handleNext} className="flex-1 h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded shadow-lg shadow-teal-100" data-testid="button-next-waiver">To Payment</Button>
      </div>
    </motion.div>
  );
};

const Payment = ({ onBack, onComplete, plans, loading }: any) => {
  const subtotal = plans.reduce((sum: number, item: any) => sum + item.plan.price, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
        <div className="bg-white border p-6 rounded shadow-sm">
            {plans.map((item: any) => (
                <div key={item.category} className="flex justify-between mb-2">
                  <div><span className="text-sm font-medium">{item.category}</span><p className="text-xs text-gray-500">{item.plan.name} ({item.plan.sessions} Sessions)</p></div>
                  <span className="font-bold text-sm">₹{item.plan.price.toLocaleString()}</span>
                </div>
            ))}
            <div className="space-y-2 text-sm text-gray-600 mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>GST (18%)</span><span>₹{tax.toLocaleString()}</span></div>
              <div className="flex justify-between text-airborne-teal font-bold pt-2 border-t text-lg"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
            </div>
        </div>
        <Button onClick={onComplete} disabled={loading} className="w-full h-14 bg-gray-900 text-white font-bold rounded" data-testid="button-pay-razorpay">
            {loading ? "Processing..." : "Pay Securely"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full" data-testid="button-cancel-payment">Back</Button>
    </motion.div>
  );
};

export default function Enroll() {
  const { enroll, user } = useMember();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    const name = user?.name && user.name !== "New Member" ? user.name : "";
    return {
      name,
      email: user?.email ?? "",
      dob: user?.dob ?? "",
      emergencyContactName: user?.emergencyContactName ?? "",
      emergencyContactPhone: user?.emergencyContactPhone ?? "",
      medicalConditions: user?.medicalConditions ?? "",
    };
  });
  const prefillDoneRef = useRef(false);
  useEffect(() => {
    if (!user?.id || prefillDoneRef.current) return;
    prefillDoneRef.current = true;
    setFormData(prev => ({
      ...prev,
      name: user.name && user.name !== "New Member" ? user.name : prev.name,
      email: user.email ?? prev.email,
      dob: user.dob ?? prev.dob,
      emergencyContactName: user.emergencyContactName ?? prev.emergencyContactName,
      emergencyContactPhone: user.emergencyContactPhone ?? prev.emergencyContactPhone,
      medicalConditions: user.medicalConditions ?? prev.medicalConditions,
    }));
  }, [user?.id, user?.name, user?.email, user?.dob, user?.emergencyContactName, user?.emergencyContactPhone, user?.medicalConditions]);
  const [kidInfo, setKidInfo] = useState({ name: "", dob: "", gender: "" });
  const [waiverData, setWaiverData] = useState({ agreedTerms: false, agreedAge: false, signatureName: "" });
  const [selectedPlans, setSelectedPlans] = useState<SelectedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [selectedClassType, setSelectedClassType] = useState<ClassType | null>(null);
  const [plansByClassType, setPlansByClassType] = useState<Record<string, MembershipPlan[]>>({});

  useEffect(() => {
    apiFetch<ClassType[]>("/api/class-types").then((r) => {
      if (r.ok && Array.isArray(r.data)) {
        setClassTypes(r.data);
        if (r.data.length > 0) setSelectedClassType((prev) => prev ?? r.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedClassType?.id) return;
    if (plansByClassType[selectedClassType.id]) return;
    apiFetch<MembershipPlan[]>(`/api/membership-plans?classTypeId=${encodeURIComponent(selectedClassType.id)}`).then(
      (r) => {
        if (r.ok && Array.isArray(r.data)) {
          setPlansByClassType((prev) => ({ ...prev, [selectedClassType.id]: r.data }));
        }
      }
    );
  }, [selectedClassType?.id]);

  const hasKidsCategory = selectedPlans.some(
    (p) => classTypes.find((c) => c.name === p.category)?.ageGroup === "Kids"
  );

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
    if (selectedPlans.length === 0) return;
    setIsLoading(true);
    try {
      await enroll(
        formData,
        selectedPlans,
        waiverData,
        hasKidsCategory ? kidInfo : undefined
      );
      setLocation("/enroll/success");
    } catch {
      // enroll shows toast on error
    } finally {
      setIsLoading(false);
    }
  };

  const totalSteps = hasKidsCategory ? 5 : 4;

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  return (
    <MobileLayout>
        <div className="p-6">
            <div className="flex gap-2 mb-8">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={cn("h-1 flex-1 rounded transition-colors", i + 1 <= step ? "bg-airborne-teal" : "bg-gray-200")} />
                ))}
            </div>
            <AnimatePresence mode="wait">
              {step === 1 && <PersonalDetails key="step1" data={formData} onChange={(k: any, v: any) => setFormData(p => ({...p, [k]: v}))} onNext={() => setStep(2)} />}
              {step === 2 && <MembershipSelection key="step2" classTypes={classTypes} plansByClassType={plansByClassType} selectedClassType={selectedClassType} onSelectClassType={setSelectedClassType} selectedPlans={selectedPlans} onAddPlan={handleAddPlan} onRemovePlan={(c: string) => setSelectedPlans(p => p.filter(x => x.category !== c))} onNext={nextStep} onBack={() => setStep(1)} />}
              {step === 3 && <KidDetails key="step3" data={kidInfo} onChange={(k: any, v: any) => setKidInfo(p => ({...p, [k]: v}))} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
              {step === 4 && <Waiver key="step4" data={waiverData} onChange={(k: any, v: any) => setWaiverData(p => ({...p, [k]: v}))} onNext={() => setStep(5)} onBack={prevStep} />}
              {step === 5 && <Payment key="step5" plans={selectedPlans} loading={isLoading} onBack={() => setStep(4)} onComplete={handleComplete} />}
            </AnimatePresence>
        </div>
    </MobileLayout>
  );
}
