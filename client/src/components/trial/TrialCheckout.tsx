import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useMember, type UserProfile } from "@/context/MemberContext";
import { apiFetch } from "@/lib/api";
import { formatTime12h } from "@/lib/formatTime";
import { parseTrialParams, type ParsedTrialParams } from "@/lib/trialParams";
import { findWalkInTrialPlan, type TrialPlan } from "@/lib/trialPlan";
import {
  validatePersonalDetails,
  personalDetailsRecordFromUser,
  isProfileCompleteForStep1,
} from "@/lib/enrollValidation";
import { getClassMembershipEnrollUrl, getKidsEnrollFallbackUrl } from "@/lib/membershipUi";
import { buildRazorpayCheckoutPrefill } from "@/lib/razorpayPrefill";
import { membershipEnrollmentStartBounds } from "@shared/membershipDates";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SessionDisplay {
  scheduleId: string;
  sessionDate: string;
  classId: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  capacity: number;
  genderRestriction?: "NONE" | "FEMALE_ONLY";
}

interface ClassTypeOption {
  id: string;
  name: string;
  ageGroup?: string;
}

type CheckoutPhase =
  | { kind: "loading" }
  | { kind: "session_missing" }
  | { kind: "plan_missing" }
  | { kind: "date_invalid" }
  | { kind: "ready"; session: SessionDisplay; trialPlan: TrialPlan };

type TrialStep = "profile" | "waiver" | "payment" | "success";

type TrialCheckoutOutcome =
  | { kind: "booked" }
  | { kind: "credit_only"; reason: string };

type WaiverData = { agreedTerms: boolean; agreedAge: boolean; signatureName: string };

function mapBookingFailureReason(result: { status: number; message: string }): string {
  const msg = result.message;
  if (msg === "Session is full") return "this class is now full.";
  if (msg.includes("no longer available for booking")) return "the booking window has closed.";
  if (msg.includes("restricted to female members")) return "this class is for female members only.";
  if (msg === "Invalid schedule slot") return "this class is no longer available.";
  if (msg === "No sessions remaining" || msg === "No sessions remaining for this class") {
    return "we couldn't apply your trial credit to this class.";
  }
  if (msg.startsWith("Your membership starts on")) return "your trial credit isn't valid for this date yet.";
  if (result.status === 0) return "something went wrong while booking this class.";
  return "something went wrong while booking this class.";
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
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

function resolveInitialTrialStep(user: UserProfile): TrialStep {
  if (!isProfileCompleteForStep1(user)) return "profile";
  if (user.hasSignedWaiver !== true) return "waiver";
  return "payment";
}

function TrialErrorCard({
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  testId = "trial-checkout-error",
}: {
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  testId?: string;
}) {
  return (
    <div
      className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-2 border-l-amber-500 p-6 rounded shadow-sm dark:shadow-black/30 text-center space-y-4"
      data-testid={testId}
    >
      <p className="text-sm text-gray-700 dark:text-[#EDEDED]">{message}</p>
      <div className="flex flex-col gap-2">
        <Button
          onClick={onPrimary}
          className="w-full h-11 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] rounded"
          data-testid="button-trial-back-book"
        >
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button
            variant="outline"
            onClick={onSecondary}
            className="w-full h-11 border-gray-200 dark:border-white/10 rounded"
            data-testid="button-trial-explore-memberships"
          >
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function SessionContextHeader({ session }: { session: SessionDisplay }) {
  const dateLabel = format(parseISO(session.sessionDate), "EEE, d MMM yyyy");
  const timeLabel = `${formatTime12h(session.startTime)} – ${formatTime12h(session.endTime)}`;

  return (
    <div className="bg-gray-50 dark:bg-[#18181B] border border-gray-100 dark:border-white/6 rounded-lg px-4 py-3 mb-6 text-sm">
      <p className="font-semibold text-gray-900 dark:text-[#EDEDED]">{session.category}</p>
      <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-1">
        {session.branch} · {dateLabel} · {timeLabel}
      </p>
    </div>
  );
}

export default function TrialCheckout() {
  const { user, updateProfile, enroll, bookSession, refreshBookings, setSelectedBranch } = useMember();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const parsed = useMemo(() => parseTrialParams(search), [search]);

  const [kidsRedirecting, setKidsRedirecting] = useState(false);
  const [phase, setPhase] = useState<CheckoutPhase>({ kind: "loading" });
  const [trialStep, setTrialStep] = useState<TrialStep>("payment");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [waiverData, setWaiverData] = useState<WaiverData>({
    agreedTerms: false,
    agreedAge: false,
    signatureName: "",
  });
  const [profileSaveStatus, setProfileSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [trialOutcome, setTrialOutcome] = useState<TrialCheckoutOutcome | null>(null);
  const stepInitializedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    setFormData(personalDetailsRecordFromUser(user));
  }, [user?.id]);

  useEffect(() => {
    if (!parsed.ok) return;

    let cancelled = false;

    async function load(params: ParsedTrialParams) {
      setPhase({ kind: "loading" });

      const classTypesResult = await apiFetch<ClassTypeOption[]>("/api/class-types");
      if (cancelled) return;

      const classType = classTypesResult.ok
        ? classTypesResult.data?.find((c) => c.id === params.classTypeId)
        : undefined;

      if (classType?.ageGroup === "Kids") {
        setKidsRedirecting(true);
        setLocation(
          getKidsEnrollFallbackUrl({
            classTypeId: params.classTypeId,
            category: params.category,
          }),
          { replace: true }
        );
        return;
      }

      const bounds = membershipEnrollmentStartBounds(new Date());
      if (params.sessionDate < bounds.min || params.sessionDate > bounds.max) {
        setPhase({ kind: "date_invalid" });
        return;
      }

      const scheduleResult = await apiFetch<{ sessions: SessionDisplay[] }>(
        `/api/schedule?branch=${encodeURIComponent(params.branch)}&date=${encodeURIComponent(params.sessionDate)}`
      );

      if (cancelled) return;

      const sessions =
        scheduleResult.ok && Array.isArray(scheduleResult.data?.sessions)
          ? scheduleResult.data.sessions
          : [];

      const session = sessions.find((s) => s.scheduleId === params.scheduleId);
      if (!session) {
        setPhase({ kind: "session_missing" });
        return;
      }

      const plansResult = await apiFetch<TrialPlan[]>(
        `/api/membership-plans?classTypeId=${encodeURIComponent(params.classTypeId)}`
      );

      if (cancelled) return;

      const plans =
        plansResult.ok && Array.isArray(plansResult.data) ? plansResult.data : [];

      const trialPlan = findWalkInTrialPlan(plans);
      if (!trialPlan) {
        setPhase({ kind: "plan_missing" });
        return;
      }

      setPhase({ kind: "ready", session, trialPlan });
    }

    void load(parsed);

    return () => {
      cancelled = true;
    };
  }, [parsed, setLocation]);

  useEffect(() => {
    if (phase.kind !== "ready" || !user || stepInitializedRef.current) return;
    stepInitializedRef.current = true;
    setTrialStep(resolveInitialTrialStep(user));
  }, [phase, user]);

  const handleProfileContinue = async () => {
    const errors = validatePersonalDetails(formData);
    if (Object.keys(errors).length > 0) return;

    setProfileSaveStatus("saving");
    setProfileSaveError(null);

    const emergencyPhone = (formData.emergencyContactPhone || "").replace(/\s/g, "");
    const result = await updateProfile({
      name: formData.name.trim(),
      email: formData.email.trim(),
      dob: formData.dob.trim(),
      gender: formData.gender.trim(),
      emergencyContactName: formData.emergencyContactName.trim(),
      emergencyContactPhone: emergencyPhone,
      medicalConditions: (formData.medicalConditions || "").trim(),
    });

    if (!result.ok) {
      setProfileSaveStatus("error");
      setProfileSaveError(result.message);
      return;
    }

    setProfileSaveStatus("idle");
    if (user?.hasSignedWaiver !== true) {
      setTrialStep("waiver");
    } else {
      setTrialStep("payment");
    }
  };

  const handleWaiverContinue = () => {
    const valid =
      waiverData.agreedTerms === true &&
      typeof waiverData.signatureName === "string" &&
      waiverData.signatureName.trim().length >= 2;
    if (!valid) return;
    setTrialStep("payment");
  };

  const handlePay = async (session: SessionDisplay, trialPlan: TrialPlan) => {
    setPaymentError(null);
    setIsPaying(true);

    const subtotal = trialPlan.price;
    const tax = trialPlan.price * 0.05;
    const amountPaise = Math.round((subtotal + tax) * 100);

    try {
      const keyRes = await apiFetch<{ keyId: string }>("/api/payments/razorpay-key");
      if (!keyRes.ok) {
        throw new Error(keyRes.message || "Payment configuration unavailable");
      }
      if (!keyRes.data?.keyId) {
        throw new Error("Payment configuration unavailable");
      }

      const orderRes = await apiFetch<{
        orderId: string;
        amount: number;
        currency: string;
        transactionId: string;
      }>("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: amountPaise, currency: "INR" }),
      });

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
        setIsPaying(false);
        setPaymentError("Payment was cancelled. You can try again.");
      };

      const prefill = buildRazorpayCheckoutPrefill({
        accountPhone: user?.phone,
        formDataEmail: formData.email,
        userEmail: user?.email,
      });

      const options: Record<string, unknown> = {
        key: keyRes.data.keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Airborne Fitness",
        description: "Trial class credit",
        webview_intent: true,
        ...(prefill ? { prefill } : {}),
        modal: {
          ondismiss: () => clearLoadingAndShowCancel(),
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
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
                [{ category: session.category, plan: trialPlan }],
                waiverData,
                undefined,
                transactionId,
                session.sessionDate
              );

              const bookResult = await bookSession(
                { scheduleId: session.scheduleId, sessionDate: session.sessionDate },
                session.category,
                { silent: true }
              );

              let outcome: TrialCheckoutOutcome;
              if (bookResult.ok) {
                outcome = { kind: "booked" };
              } else if (bookResult.status === 409 && bookResult.message === "Already booked") {
                await refreshBookings();
                outcome = { kind: "booked" };
              } else {
                outcome = { kind: "credit_only", reason: mapBookingFailureReason(bookResult) };
              }

              setTrialOutcome(outcome);
              setIsPaying(false);
              setTrialStep("success");
            } catch {
              setIsPaying(false);
              setPaymentError(
                `Payment was successful but we couldn't complete your enrollment. Please contact support with transaction ID ${transactionId}.`
              );
            }
          } catch (e) {
            setIsPaying(false);
            setPaymentError(e instanceof Error ? e.message : "Payment verification failed");
          }
        },
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.failed", () => {
        if (fallbackTimerId) clearTimeout(fallbackTimerId);
        fallbackTimerId = null;
        setIsPaying(false);
        setPaymentError("Payment failed or was cancelled. You can try again when ready.");
      });

      fallbackTimerId = setTimeout(() => {
        fallbackTimerId = null;
        setIsPaying((loading) => {
          if (loading) {
            setPaymentError("Payment was cancelled. You can try again.");
            return false;
          }
          return loading;
        });
      }, 90000);

      rzp.open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment could not be started");
      setIsPaying(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        Loading... <Loader2 size={16} />
      </div>
    );
  }

  if (kidsRedirecting) {
    return (
      <MobileLayout>
        <div
          className="flex flex-col items-center justify-center py-16 gap-2"
          data-testid="trial-kids-redirect"
        >
          <Loader2 className="h-6 w-6 animate-spin text-airborne-teal" aria-label="Opening enrollment" />
          <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">Opening enrollment…</p>
        </div>
      </MobileLayout>
    );
  }

  if (!parsed.ok) {
    return (
      <MobileLayout>
        <div className="p-6 pb-24" data-testid="trial-checkout">
          <TrialErrorCard
            message={parsed.message}
            primaryLabel="Back to Book"
            onPrimary={() => setLocation("/book")}
          />
        </div>
      </MobileLayout>
    );
  }

  const showBackToBook = trialStep !== "success";

  return (
    <MobileLayout>
      <div className="p-6 pb-24" data-testid="trial-checkout">
        {showBackToBook && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/book")}
            className="mb-4 -ml-2 text-airborne-teal dark:text-airborne-teal"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Book
          </Button>
        )}

        {phase.kind === "loading" && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-airborne-teal" aria-label="Loading trial checkout" />
          </div>
        )}

        {phase.kind === "date_invalid" && (
          <TrialErrorCard
            message="This trial link has an invalid session date."
            primaryLabel="Back to Book"
            onPrimary={() => setLocation("/book")}
          />
        )}

        {phase.kind === "session_missing" && (
          <TrialErrorCard
            message="This class is no longer available."
            primaryLabel="Back to Book"
            onPrimary={() => setLocation("/book")}
          />
        )}

        {phase.kind === "plan_missing" && (
          <TrialErrorCard
            message="Trial booking is not available for this class right now."
            primaryLabel="Back to Book"
            onPrimary={() => setLocation("/book")}
            secondaryLabel="Explore Memberships"
            onSecondary={() => setLocation("/enroll")}
          />
        )}

        {phase.kind === "ready" && trialStep === "profile" && (
          <TrialProfileStep
            session={phase.session}
            data={formData}
            onChange={(k, v) => setFormData((p) => ({ ...p, [k]: v }))}
            onContinue={handleProfileContinue}
            saveStatus={profileSaveStatus}
            saveError={profileSaveError}
          />
        )}

        {phase.kind === "ready" && trialStep === "waiver" && (
          <TrialWaiverStep
            session={phase.session}
            data={waiverData}
            onChange={(k, v) => setWaiverData((p) => ({ ...p, [k]: v }))}
            onContinue={handleWaiverContinue}
            onBack={() => setTrialStep("profile")}
          />
        )}

        {phase.kind === "ready" && trialStep === "payment" && parsed.ok && (
          <TrialPaymentStep
            session={phase.session}
            trialPlan={phase.trialPlan}
            isPaying={isPaying}
            paymentError={paymentError}
            onPay={() => handlePay(phase.session, phase.trialPlan)}
            onViewMembershipPlans={() => {
              setLocation(
                getClassMembershipEnrollUrl({
                  classTypeId: parsed.classTypeId,
                  category: phase.session.category,
                })
              );
            }}
            onBack={
              user.hasSignedWaiver !== true
                ? () => setTrialStep("waiver")
                : !isProfileCompleteForStep1(user)
                  ? () => setTrialStep("profile")
                  : undefined
            }
          />
        )}

        {phase.kind === "ready" && trialStep === "success" && trialOutcome && (
          <TrialSuccessStep
            session={phase.session}
            outcome={trialOutcome}
            onBackToBook={() => {
              setSelectedBranch(
                phase.session.branch === "Mazgaon" ? "Mazgaon" : "Lower Parel"
              );
              setLocation("/book");
            }}
            onViewSessions={() => setLocation("/sessions")}
          />
        )}
      </div>
    </MobileLayout>
  );
}

function TrialProfileStep({
  session,
  data,
  onChange,
  onContinue,
  saveStatus,
  saveError,
}: {
  session: SessionDisplay;
  data: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onContinue: () => void | Promise<void>;
  saveStatus: "idle" | "saving" | "error";
  saveError: string | null;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleNext = async () => {
    const e = validatePersonalDetails(data);
    setErrors(e);
    if (Object.keys(e).length === 0) await onContinue();
  };

  return (
    <div className="space-y-5" data-testid="trial-profile-step">
      <SessionContextHeader session={session} />
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">About You</h2>
        <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">Complete your details to continue.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Full Name *</label>
          <Input
            data-testid="trial-input-name"
            placeholder="Jane Doe"
            value={data.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            onBlur={() => handleBlur("name")}
            className={cn(
              "bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 h-12 rounded",
              errors.name && "border-red-300"
            )}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Email *</label>
          <Input
            data-testid="trial-input-email"
            type="email"
            placeholder="jane@example.com"
            value={data.email || ""}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            className={cn("bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 h-12 rounded", errors.email && "border-red-300")}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Date of Birth *</label>
          <Input
            data-testid="trial-input-dob"
            type="date"
            value={data.dob || ""}
            onChange={(e) => onChange("dob", e.target.value)}
            onBlur={() => handleBlur("dob")}
            className={cn("bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 h-12 rounded", errors.dob && "border-red-300")}
          />
          {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Gender *</label>
          <select
            data-testid="trial-select-gender"
            value={data.gender || ""}
            onChange={(e) => onChange("gender", e.target.value)}
            onBlur={() => handleBlur("gender")}
            className={cn(
              "w-full h-12 px-3 bg-gray-50 dark:bg-[#111113] border border-gray-100 dark:border-white/6 rounded",
              errors.gender && "border-red-300"
            )}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Emergency Contact *</label>
          <Input
            data-testid="trial-input-emergency-name"
            placeholder="Contact Name"
            value={data.emergencyContactName || ""}
            onChange={(e) => onChange("emergencyContactName", e.target.value)}
            onBlur={() => handleBlur("emergencyContactName")}
            className={cn("bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 h-12 rounded", errors.emergencyContactName && "border-red-300")}
          />
          {errors.emergencyContactName && <p className="text-xs text-red-500">{errors.emergencyContactName}</p>}
          <Input
            data-testid="trial-input-emergency-phone"
            placeholder="Contact Number"
            value={data.emergencyContactPhone || ""}
            onChange={(e) => onChange("emergencyContactPhone", e.target.value)}
            onBlur={() => handleBlur("emergencyContactPhone")}
            className={cn("bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 h-12 rounded", errors.emergencyContactPhone && "border-red-300")}
          />
          {errors.emergencyContactPhone && <p className="text-xs text-red-500">{errors.emergencyContactPhone}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider">Medical Conditions</label>
          <Textarea
            data-testid="trial-input-medical"
            placeholder="Any injuries or conditions we should know?"
            value={data.medicalConditions || ""}
            onChange={(e) => onChange("medicalConditions", e.target.value)}
            className="bg-gray-50 dark:bg-[#111113] border-gray-100 dark:border-white/6 rounded min-h-[100px]"
          />
        </div>
      </div>
      {saveStatus === "saving" && <p className="text-sm text-gray-500">Saving details…</p>}
      {saveStatus === "error" && saveError && (
        <p className="text-sm text-red-600" data-testid="trial-profile-save-error">{saveError}</p>
      )}
      <Button
        onClick={handleNext}
        disabled={saveStatus === "saving"}
        className="w-full h-12 bg-airborne-teal text-white rounded"
        data-testid="button-trial-profile-continue"
      >
        {saveStatus === "saving" ? "Saving…" : "Continue"}
      </Button>
    </div>
  );
}

function TrialWaiverStep({
  session,
  data,
  onChange,
  onContinue,
  onBack,
}: {
  session: SessionDisplay;
  data: WaiverData;
  onChange: (k: keyof WaiverData, v: boolean | string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const waiverValid =
    data.agreedTerms === true &&
    typeof data.signatureName === "string" &&
    data.signatureName.trim().length >= 2;
  const [touched, setTouched] = useState(false);

  const handleNext = () => {
    if (!waiverValid) {
      setTouched(true);
      return;
    }
    onContinue();
  };

  return (
    <div className="space-y-5" data-testid="trial-waiver-step">
      <SessionContextHeader session={session} />
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
      <div className="space-y-3">
        <label className="flex items-center gap-3 p-4 bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 rounded cursor-pointer">
          <input
            type="checkbox"
            checked={data.agreedTerms}
            onChange={(e) => onChange("agreedTerms", e.target.checked)}
            className="w-4 h-4 rounded"
            data-testid="trial-checkbox-waiver-agree"
          />
          <span className="text-sm text-gray-600 dark:text-[#9CA3AF]">I have read and agree to the waiver terms. *</span>
        </label>
        <label className="flex items-center gap-3 p-4 bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 rounded cursor-pointer">
          <input
            type="checkbox"
            checked={data.agreedAge}
            onChange={(e) => onChange("agreedAge", e.target.checked)}
            className="w-4 h-4 rounded"
            data-testid="trial-checkbox-age-confirm"
          />
          <span className="text-sm text-gray-600 dark:text-[#9CA3AF]">I am 18 years of age or older.</span>
        </label>
        <Input
          placeholder="Type Full Name"
          value={data.signatureName || ""}
          onChange={(e) => onChange("signatureName", e.target.value)}
          className={cn("bg-gray-50 dark:bg-[#111113] h-12 rounded", touched && !waiverValid && !data.signatureName?.trim() && "border-red-300")}
          data-testid="trial-input-signature"
        />
      </div>
      {touched && !waiverValid && (
        <p className="text-sm text-amber-600">Agree to the waiver terms and enter your full name to continue.</p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded" data-testid="button-trial-back-waiver">
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1 h-12 bg-airborne-teal text-white rounded" data-testid="button-trial-waiver-continue">
          Continue
        </Button>
      </div>
    </div>
  );
}

function TrialPaymentStep({
  session,
  trialPlan,
  isPaying,
  paymentError,
  onPay,
  onViewMembershipPlans,
  onBack,
}: {
  session: SessionDisplay;
  trialPlan: TrialPlan;
  isPaying: boolean;
  paymentError: string | null;
  onPay: () => void;
  onViewMembershipPlans: () => void;
  onBack?: () => void;
}) {
  const dateLabel = format(parseISO(session.sessionDate), "EEE, d MMM yyyy");
  const timeLabel = `${formatTime12h(session.startTime)} – ${formatTime12h(session.endTime)}`;
  const subtotal = trialPlan.price;
  const tax = trialPlan.price * 0.05;
  const total = subtotal + tax;

  return (
    <div className="space-y-6" data-testid="trial-checkout-summary">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Book Trial Class</h1>

      <div className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-6 rounded shadow-sm dark:shadow-black/30 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-[#9CA3AF] mb-1">Class</p>
          <p className="font-semibold text-gray-900 dark:text-[#EDEDED]">{session.category}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">Branch</p>
            <p className="font-medium text-gray-900 dark:text-[#EDEDED]">{session.branch}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">Date</p>
            <p className="font-medium text-gray-900 dark:text-[#EDEDED]">{dateLabel}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">Time</p>
            <p className="font-medium text-gray-900 dark:text-[#EDEDED]">{timeLabel}</p>
          </div>
        </div>
        {session.genderRestriction === "FEMALE_ONLY" && (
          <span className="inline-block text-xs font-medium px-2 py-1 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-100 dark:border-pink-800">
            Female only
          </span>
        )}
        <div className="pt-4 border-t border-gray-100 dark:border-white/6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-[#9CA3AF]">{trialPlan.name}</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-[#9CA3AF]">
            <span>GST (5%)</span>
            <span>₹{tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-airborne-teal text-lg pt-2 border-t border-gray-100 dark:border-white/6">
            <span>Total</span>
            <span>₹{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {paymentError && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-100" data-testid="trial-payment-error">
          {paymentError}
        </p>
      )}

      <Button
        onClick={onPay}
        disabled={isPaying}
        className="w-full h-14 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] font-bold rounded"
        data-testid="button-trial-pay"
      >
        {isPaying ? "Processing…" : "Pay Now"}
      </Button>

      <div className="space-y-2 pt-1">
        <p className="text-xs text-center text-gray-500 dark:text-[#9CA3AF]">Planning to continue?</p>
        <Button
          variant="outline"
          onClick={onViewMembershipPlans}
          disabled={isPaying}
          className="w-full h-11 border-gray-200 dark:border-white/10 text-gray-700 dark:text-[#EDEDED] rounded"
          data-testid="button-trial-view-membership-plans"
        >
          View Membership Plans
        </Button>
      </div>

      {onBack && (
        <Button variant="ghost" onClick={onBack} className="w-full" data-testid="button-trial-back-payment">
          Back
        </Button>
      )}
    </div>
  );
}

function TrialSuccessStep({
  session,
  outcome,
  onBackToBook,
  onViewSessions,
}: {
  session: SessionDisplay;
  outcome: TrialCheckoutOutcome;
  onBackToBook: () => void;
  onViewSessions: () => void;
}) {
  const dateLabel = format(parseISO(session.sessionDate), "EEE, d MMM yyyy");
  const timeLabel = formatTime12h(session.startTime);

  if (outcome.kind === "booked") {
    return (
      <div
        className="min-h-[50vh] flex flex-col items-center text-center space-y-6"
        data-testid="trial-success-booked"
      >
        <div className="w-16 h-16 rounded-full bg-airborne-teal/10 flex items-center justify-center">
          <Check className="w-8 h-8 text-airborne-teal stroke-[2.5]" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Trial class booked</h1>
          <p className="text-gray-600 dark:text-[#9CA3AF] max-w-sm">
            You&apos;re booked for{" "}
            <span className="font-semibold text-gray-900 dark:text-[#EDEDED]">{session.category}</span> on{" "}
            <span className="font-semibold text-gray-900 dark:text-[#EDEDED]">{dateLabel}</span> at{" "}
            <span className="font-semibold text-gray-900 dark:text-[#EDEDED]">{timeLabel}</span>.
          </p>
          <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{session.branch}</p>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-2">
          <Button
            onClick={onViewSessions}
            className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white font-semibold rounded-xl"
            data-testid="button-trial-success-view-sessions"
          >
            View My Sessions
          </Button>
          <Button
            variant="outline"
            onClick={onBackToBook}
            className="w-full h-11 border-gray-200 dark:border-white/10 rounded-xl"
            data-testid="button-trial-success-back-book"
          >
            Back to Book
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[50vh] flex flex-col items-center text-center space-y-6"
      data-testid="trial-success-credit-only"
    >
      <div className="w-16 h-16 rounded-full bg-airborne-teal/10 flex items-center justify-center">
        <Check className="w-8 h-8 text-airborne-teal stroke-[2.5]" />
      </div>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Trial credit added</h1>
        <p className="text-gray-600 dark:text-[#9CA3AF] max-w-sm">
          We couldn&apos;t book this class because{" "}
          <span className="font-semibold text-gray-900 dark:text-[#EDEDED]">{outcome.reason}</span> Your 1-session trial
          credit is active. Please choose another slot.
        </p>
        <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
          Selected: {dateLabel} · {timeLabel} · {session.branch}
        </p>
      </div>
      <Button
        onClick={onBackToBook}
        className="w-full max-w-xs h-12 bg-airborne-teal hover:bg-airborne-deep text-white font-semibold rounded-xl"
        data-testid="button-trial-success-back-book"
      >
        Back to Book
      </Button>
    </div>
  );
}
