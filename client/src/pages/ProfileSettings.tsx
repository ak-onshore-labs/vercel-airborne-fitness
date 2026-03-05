import { useState, useEffect } from "react";
import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ProfileSettings() {
  const { user, updateProfile } = useMember();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await updateProfile({
        name: formData.fullName.trim(),
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
        <Button variant="ghost" size="sm" onClick={() => setLocation("/profile")} className="mb-4 -ml-2 text-gray-600">
          <ArrowLeft size={16} className="mr-2" /> Back to Profile
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Full Name</label>
            <Input
              value={formData.fullName}
              onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
              className="bg-gray-50 border-gray-100"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              className="bg-gray-50 border-gray-100"
              placeholder="Email"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Date of Birth</label>
            <Input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData((p) => ({ ...p, dob: e.target.value }))}
              className="bg-gray-50 border-gray-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Emergency Contact Name</label>
            <Input
              value={formData.emergencyContactName}
              onChange={(e) => setFormData((p) => ({ ...p, emergencyContactName: e.target.value }))}
              className="bg-gray-50 border-gray-100"
              placeholder="Name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Emergency Contact Phone</label>
            <Input
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
              className="bg-gray-50 border-gray-100"
              placeholder="10-digit phone"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Medical Conditions</label>
            <Textarea
              value={formData.medicalConditions}
              onChange={(e) => setFormData((p) => ({ ...p, medicalConditions: e.target.value }))}
              className="bg-gray-50 border-gray-100 min-h-[80px]"
              placeholder="Any conditions we should know about"
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full h-12 bg-airborne-teal hover:bg-airborne-deep text-white rounded-xl">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
