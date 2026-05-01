import { useState, useEffect } from "react";
import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { MemberDialogContent } from "@/components/MemberDialogContent";

/** Explicit value/placeholder colors so light field backgrounds are not paired with theme light text (unreadable in dark mode). */
const ACCOUNT_FIELD_CLASS =
  "bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-500 dark:bg-[#111113] dark:border-white/10 dark:text-gray-100 dark:placeholder:text-gray-400";

export default function ProfileSettings() {
  const { user, updateProfile, deleteAccount, logout } = useMember();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    gender: "",
    email: "",
    dob: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalConditions: "",
  });

  useEffect(() => {
    if (!user) return;
    setFormData({
      fullName: user.name || "",
      gender: user.gender || "",
      email: user.email || "",
      dob: user.dob || "",
      emergencyContactName: user.emergencyContactName || "",
      emergencyContactPhone: user.emergencyContactPhone || "",
      medicalConditions: user.medicalConditions || "",
    });
  }, [user?.id]);

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (deleteLoading) return;
    setDeleteDialogOpen(open);
    if (!open) setDeleteAcknowledged(false);
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const result = await deleteAccount();
      if (result.ok) {
        toast({ title: "Your account was deleted" });
        setDeleteDialogOpen(false);
        setDeleteAcknowledged(false);
        logout();
        setLocation("/login");
      } else {
        toast({
          variant: "destructive",
          title: "Could not delete account",
          description: result.message,
        });
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await updateProfile({
        name: formData.fullName.trim(),
        gender: formData.gender.trim() || undefined,
        email: formData.email.trim(),
        dob: formData.dob.trim() || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        medicalConditions: formData.medicalConditions.trim() || undefined,
      });
      if (ok) {
        toast({ title: "Profile updated successfully", variant: "default" });
      } else {
        toast({ variant: "destructive", title: "Update failed" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileLayout>
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/profile")} className="mb-4 -ml-2 text-airborne-teal hover:bg-teal-50 dark:hover:bg-teal-900/30">
          <ArrowLeft size={16} className="mr-2" /> Back to Profile
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Account Settings</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Full Name</label>
            <Input
              value={formData.fullName}
              onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
              className={ACCOUNT_FIELD_CLASS}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
              className={`${ACCOUNT_FIELD_CLASS} h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-1 focus:ring-airborne-teal`}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              className={ACCOUNT_FIELD_CLASS}
              placeholder="Email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Date of Birth</label>
            <Input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData((p) => ({ ...p, dob: e.target.value }))}
              className={`${ACCOUNT_FIELD_CLASS} [color-scheme:light] dark:[color-scheme:dark]`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Emergency Contact Name</label>
            <Input
              value={formData.emergencyContactName}
              onChange={(e) => setFormData((p) => ({ ...p, emergencyContactName: e.target.value }))}
              className={ACCOUNT_FIELD_CLASS}
              placeholder="Name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Emergency Contact Phone</label>
            <Input
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
              className={ACCOUNT_FIELD_CLASS}
              placeholder="10-digit phone"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Medical Conditions</label>
            <Textarea
              value={formData.medicalConditions}
              onChange={(e) => setFormData((p) => ({ ...p, medicalConditions: e.target.value }))}
              className={`${ACCOUNT_FIELD_CLASS} min-h-[80px]`}
              placeholder="Any conditions we should know about"
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded-xl">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>

        <section className="mt-10 pt-8 border-t border-gray-200 dark:border-white/10" aria-labelledby="danger-zone-heading">
          <h2 id="danger-zone-heading" className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
            Danger zone
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Permanently delete your account and profile data from this app. This cannot be undone from your phone.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete account
          </Button>
        </section>

        <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
          <MemberDialogContent
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              if (deleteLoading) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-left text-sm text-gray-600 dark:text-gray-300">
                  <p>
                    This will <span className="font-medium text-gray-900 dark:text-gray-100">permanently delete your account</span>.
                    Your memberships will be removed, and any upcoming bookings will be cancelled. This action cannot be undone.
                  </p>
                  <div className="flex items-start gap-3 pt-1">
                    <Checkbox
                      id="delete-account-ack"
                      checked={deleteAcknowledged}
                      onCheckedChange={(v) => setDeleteAcknowledged(v === true)}
                      disabled={deleteLoading}
                      className="mt-0.5"
                    />
                    <Label htmlFor="delete-account-ack" className="text-sm font-normal leading-snug cursor-pointer">
                      I understand that my memberships will be removed, upcoming bookings will be cancelled, and this cannot be undone.
                    </Label>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => handleDeleteDialogOpenChange(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={!deleteAcknowledged || deleteLoading}
                onClick={handleConfirmDeleteAccount}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting…
                  </>
                ) : (
                  "Delete account"
                )}
              </Button>
            </DialogFooter>
          </MemberDialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
