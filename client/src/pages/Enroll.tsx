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
import { format, isSameDay, addDays, startOfToday } from "date-fns";
import { formatTime12h } from "@/lib/formatTime";
import filledBicep from "@assets/filled_bicep.svg";
import blackBicep from "@assets/black_bicep.svg";

interface SessionDisplay {
  scheduleId: string;
  sessionDate: string;
  classId: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

function getNext7Days() {
  const today = startOfToday();
  return Array.from({ length: 7 }).map((_, i) => addDays(today, i));
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: () => void) => void };
  }
}

function loadRazorpay(): Promise<typeof window.Razorpay> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

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

type BranchOption = "Lower Parel" | "Mazgaon";

/** Lightweight read-only schedule view for enrollment plan evaluation. Local branch toggle for comparison. */
function EnrollScheduleSheetContent({
  initialBranch,
  classTypes,
}: {
  initialBranch: BranchOption;
  classTypes: ClassType[];
}) {
  const dates = getNext7Days();
  const [branch, setBranch] = useState<BranchOption>(initialBranch);
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [filter, setFilter] = useState<string>("All");
  const [sessions, setSessions] = useState<SessionDisplay[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  useEffect(() => {
    setLoadingSchedule(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    apiFetch<{ sessions: SessionDisplay[] }>(
      `/api/schedule?branch=${encodeURIComponent(branch)}&date=${encodeURIComponent(dateStr)}`
    )
      .then((r) => {
        if (r.ok && Array.isArray(r.data?.sessions)) setSessions(r.data.sessions);
        else setSessions([]);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoadingSchedule(false));
  }, [branch, selectedDate]);

  const filteredSessions =
    filter === "All" ? sessions : sessions.filter((s) => s.category === filter);
  const filterChips = ["All", ...classTypes.map((t) => t.name)];

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF] shrink-0">Branch</span>
        <div className="flex rounded-lg border border-gray-200 dark:border-white/10 p-0.5 bg-gray-100 dark:bg-[#18181B]">
          {(["Lower Parel", "Mazgaon"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBranch(b)}
              className={cn(
                "min-w-[5rem] py-1.5 px-3 rounded-md text-xs font-medium transition-all text-center",
                branch === b
                  ? "bg-white dark:bg-[#111113] text-gray-900 dark:text-[#EDEDED] shadow-sm"
                  : "text-gray-600 dark:text-[#9CA3AF] hover:text-gray-900 dark:hover:text-[#EDEDED]"
              )}
            >
              {b === "Lower Parel" ? "Lower Parel" : "Mazgaon"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF] shrink-0">Day</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1 min-w-0">
          {dates.map((d, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[2.75rem] h-12 rounded-md border transition-all shrink-0",
                isSameDay(d, selectedDate)
                  ? "bg-airborne-teal border-airborne-teal text-white"
                  : "bg-gray-50 dark:bg-[#111113] border-gray-200 dark:border-white/10 text-gray-500 dark:text-[#9CA3AF]"
              )}
            >
              <span className="text-[10px] font-semibold uppercase leading-tight">{format(d, "EEE")}</span>
              <span className="text-sm font-bold leading-tight">{format(d, "d")}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF] shrink-0">Class</span>
        <div className="flex gap-1.5 overflow-x-auto overflow-y-hidden pb-1 scrollbar-hide flex-1 min-w-0">
          {filterChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setFilter(chip)}
              className={cn(
                "shrink-0 py-1.5 px-3 rounded-full text-xs font-medium whitespace-nowrap border transition-all text-center",
                filter === chip
                  ? "bg-airborne-teal/10 dark:bg-airborne-teal/25 border-airborne-teal dark:border-teal-400 text-airborne-deep dark:text-teal-200"
                  : "bg-white dark:bg-[#111113] text-gray-500 dark:text-[#9CA3AF] border-gray-200 dark:border-white/10"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        {loadingSchedule ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-[#9CA3AF] text-center py-6">No classes on this day.</p>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={`${session.scheduleId}_${session.sessionDate}_${session.startTime}`}
              className="flex gap-3 rounded-lg border border-gray-100 dark:border-white/6 border-l-2 border-l-airborne-teal dark:border-l-teal-400 bg-gray-50/50 dark:bg-[#111113] px-3 py-2.5 transition-shadow duration-200 hover:shadow-md dark:hover:shadow-black/30"
            >
              <div className="flex flex-col items-center justify-center w-12 border-r border-gray-200 dark:border-white/10 pr-3 text-center shrink-0">
                <span className="text-sm font-bold text-gray-900 dark:text-[#EDEDED] leading-tight">{formatTime12h(session.startTime)}</span>
                <span className="text-[10px] text-gray-500 dark:text-[#9CA3AF] leading-tight">{formatTime12h(session.endTime)}</span>
              </div>
              <div className="min-w-0 flex-1 flex items-center">
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-[#EDEDED] truncate">{session.category}</h4>
                  <p className="text-[10px] text-gray-500 dark:text-[#9CA3AF] truncate">{session.branch}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">About You</h2>
        <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">Let's get to know you better.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Full Name *</label>
          <Input
            data-testid="input-name"
            placeholder="Jane Doe"
            value={data.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            className={cn(
              "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] h-12 rounded focus-visible:ring-airborne-teal",
              errors.name && "border-red-300"
            )}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Email *</label>
          <Input
            data-testid="input-email"
            placeholder="jane@example.com"
            type="email"
            value={data.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            className={cn(
              "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] h-12 rounded focus-visible:ring-airborne-teal",
              errors.email && "border-red-300"
            )}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Date of Birth *</label>
          <Input
            data-testid="input-dob"
            type="date"
            value={data.dob || ""}
            onChange={(e) => onChange("dob", e.target.value)}
            onBlur={() => handleBlur("dob")}
            className={cn(
              "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] h-12 rounded focus-visible:ring-airborne-teal",
              errors.dob && "border-red-300"
            )}
          />
          {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Emergency Contact *</label>
          <div className="space-y-2">
            <Input
              data-testid="input-emergency-name"
              placeholder="Contact Name"
              value={data.emergencyContactName || ""}
              onChange={(e) => onChange("emergencyContactName", e.target.value)}
              onBlur={() => handleBlur("emergencyContactName")}
              className={cn(
                "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] h-12 rounded focus-visible:ring-airborne-teal",
                errors.emergencyContactName && "border-red-300"
              )}
            />
            {errors.emergencyContactName && <p className="text-xs text-red-500">{errors.emergencyContactName}</p>}
            <Input
              data-testid="input-emergency-phone"
              placeholder="Contact Number"
              value={data.emergencyContactPhone || ""}
              onChange={(e) => onChange("emergencyContactPhone", e.target.value)}
              onBlur={() => handleBlur("emergencyContactPhone")}
              className={cn(
                "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] h-12 rounded focus-visible:ring-airborne-teal",
                errors.emergencyContactPhone && "border-red-300"
              )}
            />
            {errors.emergencyContactPhone && <p className="text-xs text-red-500">{errors.emergencyContactPhone}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Medical Conditions</label>
          <Textarea
            data-testid="input-medical"
            placeholder="Any injuries or conditions we should know?"
            value={data.medicalConditions || ""}
            onChange={(e) => onChange("medicalConditions", e.target.value)}
            className="bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] rounded focus-visible:ring-airborne-teal min-h-[100px]"
          />
        </div>
      </div>
      <Button onClick={handleNext} className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded shadow-lg shadow-teal-100 mt-4" data-testid="button-next-1">
        Continue
      </Button>
    </motion.div>
  );
};

const MembershipSelection = ({ onNext, onBack, onAddPlan, onRemovePlan, selectedPlans, classTypes, plansByClassType, selectedClassType, onSelectClassType, onViewSchedule }: any) => {
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [infoClass, setInfoClass] = useState<ClassType | null>(null);
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Select Plans</h2>
        <Button variant="outline" size="sm" onClick={onViewSchedule} className="text-airborne-teal border-airborne-teal dark:bg-transparent dark:hover:bg-teal-900/20" data-testid="button-view-schedule">
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
              selectedClassType?.id === cls.id
                ? "bg-gray-900 border-gray-900"
                : selectedPlans.some((p: any) => p.category === cls.name)
                  ? "bg-teal-50 dark:bg-teal-900/30 border-airborne-teal dark:border-teal-400"
                  : "bg-white dark:bg-[#111113] border-gray-200 dark:border-white/6"
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
        <div className="rounded border border-gray-100 dark:border-white/6 bg-gray-50/50 dark:bg-[#111113] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#9CA3AF]">Strength level</span>
            <StrengthIcons level={selectedClassType.strengthLevel ?? 1} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openClassInfo(selectedClassType)}
            className="w-full justify-center text-airborne-teal border-airborne-teal/50 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            data-testid={`button-class-info-${selectedClassType.id}`}
          >
            <Info size={14} className="mr-1" /> Class info
          </Button>
        </div>
      )}

      <Sheet open={infoSheetOpen} onOpenChange={setInfoSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#111113]"
        >
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2 pr-12 border-b border-gray-100 dark:border-white/6">
            <SheetTitle className="text-left text-lg text-gray-900 dark:text-[#EDEDED]">{infoClass?.name ?? "Class info"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {bullets.length > 0 ? (
              <ul className="space-y-2 pb-6">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 dark:text-[#9CA3AF]">
                    <span className="text-airborne-teal mt-0.5 shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-[#9CA3AF] pb-6">No additional info for this class.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="space-y-3">
        {selectedClassType && currentPlans.map((plan: MembershipPlan) => (
          <div
            key={plan.id}
            onClick={() => onAddPlan(selectedClassType.name, plan)}
            data-testid={`card-plan-${plan.id}`}
            className={cn(
              "p-5 rounded border border-l-2 border-l-airborne-teal dark:border-l-teal-400 cursor-pointer transition-shadow duration-200 hover:shadow-md",
              currentPlan?.plan.id === plan.id
                ? "bg-teal-50 dark:bg-teal-900/30 border-airborne-teal dark:border-teal-400"
                : "bg-white dark:bg-[#111113] border-gray-100 dark:border-white/6"
            )}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-[#EDEDED]">{plan.name}</h3>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                  {plan.sessions} sessions{plan.validityDays ? ` • Valid ${plan.validityDays} days` : ''}
                </p>
              </div>
              <span className="font-bold text-gray-900 dark:text-[#EDEDED]">₹{plan.price.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
      {selectedPlans.length === 0 && selectedClassType && (
        <p className="text-sm text-amber-600" data-testid="error-select-plan">Select at least one plan to continue.</p>
      )}

      {selectedPlans.length > 0 && (
        <div className="bg-gray-50 dark:bg-[#111113] p-4 rounded border border-gray-200 dark:border-white/10 border-l-2 border-l-airborne-teal dark:border-l-teal-400">
          <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-[#9CA3AF] mb-2">Selected ({selectedPlans.length})</h4>
          {selectedPlans.map((item: any) => (
            <div key={item.category} className="flex justify-between items-center text-sm mb-1">
              <span className="text-gray-900 dark:text-[#EDEDED] font-medium">{item.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-[#9CA3AF]">{item.plan.name}</span>
                <button onClick={() => onRemovePlan(item.category)} className="text-gray-400 dark:text-[#6B7280] hover:text-red-500"><X size={14} /></button>
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Kid's Details</h2>
      <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">Required for kids class enrollment.</p>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Kid's Name *</label>
          <Input
            data-testid="input-kid-name"
            placeholder="Kid's Name"
            value={data.name || ""}
            onChange={e => onChange("name", e.target.value)}
            className={cn(
              "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] h-12 rounded",
              errors.name && "border-red-300"
            )}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Kid's Date of Birth *</label>
          <Input
            data-testid="input-kid-dob"
            type="date"
            value={data.dob || ""}
            onChange={e => onChange("dob", e.target.value)}
            className={cn(
              "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] h-12 rounded",
              errors.dob && "border-red-300"
            )}
          />
          {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Gender *</label>
          <select data-testid="select-kid-gender" value={data.gender || ""} onChange={e => onChange("gender", e.target.value)} className={cn("w-full h-12 px-3 bg-gray-50 dark:bg-[#111113] border border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] rounded outline-none focus:ring-1 focus:ring-airborne-teal", errors.gender && "border-red-300")}>
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Waiver</h2>
        <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">Please review and sign.</p>
      </div>

      <div className="bg-gray-50 dark:bg-[#111113] border border-gray-100 dark:border-white/6 p-6 rounded text-xs text-gray-500 dark:text-[#9CA3AF] leading-relaxed">
        <p className="mb-4 font-bold text-gray-700 dark:text-[#EDEDED] uppercase tracking-tight">Liability Waiver and Release</p>
        <div className="space-y-3">
          <p>1. I acknowledge that I am voluntarily participating in the activities offered by Airborne Fitness.</p>
          <p>2. I recognize that these activities involve physical exertion and potential risks of injury.</p>
          <p>3. I hereby release, waive, discharge, and covenant not to sue Airborne Fitness, its owners, instructors, and agents from any and all liability.</p>
          <p>4. I certify that I am physically fit and have not been advised to the contrary by a qualified medical professional.</p>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-3 p-4 bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 rounded cursor-pointer hover:border-gray-200 dark:hover:border-white/10 transition-colors">
          <input type="checkbox" checked={data.agreedTerms} onChange={e => onChange("agreedTerms", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-airborne-teal focus:ring-airborne-teal" data-testid="checkbox-waiver-agree" />
          <span className="text-sm text-gray-600 dark:text-[#9CA3AF]">I have read and agree to the waiver terms. *</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 rounded cursor-pointer hover:border-gray-200 dark:hover:border-white/10 transition-colors">
          <input type="checkbox" checked={data.agreedAge} onChange={e => onChange("agreedAge", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-airborne-teal focus:ring-airborne-teal" data-testid="checkbox-age-confirm" />
          <span className="text-sm text-gray-600 dark:text-[#9CA3AF]">I am 18 years of age or older.</span>
        </label>

        <div className="space-y-1 pt-2">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Digital Signature (Full Name) *</label>
          <Input
            placeholder="Type Full Name"
            value={data.signatureName || ""}
            onChange={e => onChange("signatureName", e.target.value)}
            className={cn(
              "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-900 dark:text-[#EDEDED] placeholder:text-gray-400 dark:placeholder:text-[#6B7280] h-12 rounded focus-visible:ring-airborne-teal",
              touched && !waiverValid && !data.signatureName?.trim() && "border-red-300"
            )}
            data-testid="input-signature"
          />
        </div>
      </div>
      {touched && !waiverValid && (
        <p className="text-sm text-amber-600">Agree to the waiver terms and enter your full name to continue.</p>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 border-gray-200 dark:border-white/10 text-gray-600 dark:text-[#EDEDED] rounded" data-testid="button-back-waiver">Back</Button>
        <Button onClick={handleNext} className="flex-1 h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded shadow-lg shadow-teal-100" data-testid="button-next-waiver">To Payment</Button>
      </div>
    </motion.div>
  );
};

const Payment = ({ onBack, onPay, plans, loading, loadingError }: any) => {
  const subtotal = plans.reduce((sum: number, item: any) => sum + item.plan.price, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const amountPaise = Math.round(total * 100);
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Payment</h2>
        {loadingError && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-100 dark:border-red-800" data-testid="payment-error">{loadingError}</p>
        )}
        <div className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-6 rounded shadow-sm dark:shadow-black/30">
            {plans.map((item: any) => (
                <div key={item.category} className="flex justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-[#EDEDED]">{item.category}</span>
                    <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{item.plan.name} ({item.plan.sessions} Sessions)</p>
                  </div>
                  <span className="font-bold text-sm text-gray-900 dark:text-[#EDEDED]">₹{item.plan.price.toLocaleString()}</span>
                </div>
            ))}
            <div className="space-y-2 text-sm text-gray-600 dark:text-[#9CA3AF] mt-4 pt-4 border-t border-gray-100 dark:border-white/6">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>GST (5%)</span><span>₹{tax.toLocaleString()}</span></div>
              <div className="flex justify-between text-airborne-teal font-bold pt-2 border-t border-gray-100 dark:border-white/6 text-lg"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
            </div>
        </div>
        <Button onClick={() => onPay(amountPaise)} disabled={loading} className="w-full h-14 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] font-bold rounded" data-testid="button-pay-razorpay">
            {loading ? "Processing..." : "Pay Securely"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full" data-testid="button-cancel-payment">Back</Button>
    </motion.div>
  );
};

export default function Enroll() {
  const { enroll, user, selectedBranch } = useMember();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const isRenewFlow = searchParams.get("renew") === "1";
  const renewCategoryParam = searchParams.get("category");
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [step, setStep] = useState(() => (isRenewFlow ? 2 : 1));
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
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [selectedClassType, setSelectedClassType] = useState<ClassType | null>(null);
  const [plansByClassType, setPlansByClassType] = useState<Record<string, MembershipPlan[]>>({});

  useEffect(() => {
    apiFetch<ClassType[]>("/api/class-types").then((r) => {
      if (r.ok && Array.isArray(r.data)) {
        const sorted = [...r.data].sort((a, b) => a.name.localeCompare(b.name, "en"));
        setClassTypes(sorted);
        if (sorted.length > 0) {
          setSelectedClassType((prev) => {
            if (prev) return prev;
            if (isRenewFlow && renewCategoryParam) {
              const match = sorted.find((c) => c.name === renewCategoryParam);
              if (match) return match;
            }
            return sorted[0];
          });
        }
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

  const handlePay = async (amountPaise: number) => {
    if (selectedPlans.length === 0) return;
    setLoadingError(null);
    setIsLoading(true);
    try {
      const keyRes = await apiFetch<{ keyId: string }>("/api/payments/razorpay-key");
      if (!keyRes.ok) {
        throw new Error(keyRes.message || "Payment configuration unavailable");
      }
      if (!keyRes.data?.keyId) {
        throw new Error("Payment configuration unavailable");
      }
      const orderRes = await apiFetch<{ orderId: string; amount: number; currency: string; transactionId: string }>(
        "/api/payments/create-order",
        {
          method: "POST",
          body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
        }
      );
      if (!orderRes.ok || !orderRes.data) {
        throw new Error(orderRes.message || "Could not create order");
      }
      const { orderId, amount, currency, transactionId } = orderRes.data;

      const Razorpay = await loadRazorpay();
      await apiFetch(`/api/payments/transactions/${transactionId}/set-pending`, { method: "PATCH" });

      let fallbackTimerId: ReturnType<typeof setTimeout> | null = null;
      const clearLoadingAndShowCancel = () => {
        if (fallbackTimerId) clearTimeout(fallbackTimerId);
        fallbackTimerId = null;
        setIsLoading(false);
        setLoadingError("Payment was cancelled. You can try again.");
      };

      const options: Record<string, unknown> = {
        key: keyRes.data.keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Airborne Fitness",
        description: "Membership enrollment",
        modal: {
          ondismiss: () => clearLoadingAndShowCancel(),
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          if (fallbackTimerId) clearTimeout(fallbackTimerId);
          fallbackTimerId = null;
          try {
            const verifyRes = await apiFetch<{ verified: boolean }>("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                transactionId,
              }),
            });
            if (!verifyRes.ok) {
              throw new Error(verifyRes.message || "Payment verification failed");
            }
            if (!verifyRes.data?.verified) {
              throw new Error("Payment verification failed");
            }
            try {
              await enroll(
                formData,
                selectedPlans,
                waiverData,
                hasKidsCategory ? kidInfo : undefined,
                transactionId
              );
              setLocation("/enroll/success");
            } catch (enrollErr) {
              setIsLoading(false);
              setLoadingError(
                "Payment was successful but we couldn't complete your enrollment. Please contact support with your transaction details—we'll get you set up."
              );
            }
          } catch (e) {
            setIsLoading(false);
            setLoadingError(e instanceof Error ? e.message : "Payment verification failed");
          }
        },
      };
      const rzp = new Razorpay(options);
      rzp.on("payment.failed", () => {
        if (fallbackTimerId) clearTimeout(fallbackTimerId);
        fallbackTimerId = null;
        setIsLoading(false);
        setLoadingError("Payment failed or was cancelled. You can try again when ready.");
      });

      fallbackTimerId = setTimeout(() => {
        fallbackTimerId = null;
        setIsLoading((loading) => {
          if (loading) {
            setLoadingError("Payment was cancelled. You can try again.");
            return false;
          }
          return loading;
        });
      }, 90000);

      rzp.open();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment could not be started";
      setLoadingError(message);
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
                    <div key={i} className={cn("h-1 flex-1 rounded transition-colors", i + 1 <= step ? "bg-airborne-teal" : "bg-gray-200 dark:bg-[#18181B]")} />
                ))}
            </div>
            <AnimatePresence mode="wait">
              {step === 1 && <PersonalDetails key="step1" data={formData} onChange={(k: any, v: any) => setFormData(p => ({...p, [k]: v}))} onNext={() => setStep(2)} />}
              {step === 2 && <MembershipSelection key="step2" classTypes={classTypes} plansByClassType={plansByClassType} selectedClassType={selectedClassType} onSelectClassType={setSelectedClassType} selectedPlans={selectedPlans} onAddPlan={handleAddPlan} onRemovePlan={(c: string) => setSelectedPlans(p => p.filter(x => x.category !== c))} onNext={nextStep} onBack={() => setStep(1)} onViewSchedule={() => setScheduleSheetOpen(true)} />}
              {step === 3 && <KidDetails key="step3" data={kidInfo} onChange={(k: any, v: any) => setKidInfo(p => ({...p, [k]: v}))} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
              {step === 4 && <Waiver key="step4" data={waiverData} onChange={(k: any, v: any) => setWaiverData(p => ({...p, [k]: v}))} onNext={() => setStep(5)} onBack={prevStep} />}
              {step === 5 && <Payment key="step5" plans={selectedPlans} loading={isLoading} loadingError={loadingError} onBack={() => setStep(4)} onPay={handlePay} />}
            </AnimatePresence>
        </div>

        <Sheet open={scheduleSheetOpen} onOpenChange={setScheduleSheetOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-[#111113]">
            <SheetHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-4 pr-12 border-b border-gray-100 dark:border-white/6 shrink-0">
              <SheetTitle className="text-left text-lg text-gray-900 dark:text-[#EDEDED]">Schedule</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 min-h-0">
              <EnrollScheduleSheetContent initialBranch={selectedBranch} classTypes={classTypes} />
            </div>
          </SheetContent>
        </Sheet>
    </MobileLayout>
  );
}
