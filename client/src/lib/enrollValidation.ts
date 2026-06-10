import type { UserProfile } from "@/context/MemberContext";

const PERSONAL_DETAIL_FRIENDLY_MESSAGES: Record<string, string> = {
  name: "Please enter your name",
  email: "Please enter a valid email address",
  dob: "Please enter your date of birth",
  gender: "Please select your gender",
  emergencyContactName: "Please enter emergency contact name",
  emergencyContactPhone: "Please enter emergency contact number",
};

const ALLOWED_GENDERS = new Set(["Male", "Female", "Other", "Prefer not to say"]);

export function validatePersonalDetails(data: Record<string, string>): Record<string, string> {
  const err: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 2) err.name = PERSONAL_DETAIL_FRIENDLY_MESSAGES.name;
  if (!data.dob || !data.dob.trim()) err.dob = PERSONAL_DETAIL_FRIENDLY_MESSAGES.dob;
  else if (Number.isNaN(new Date(data.dob).getTime())) err.dob = PERSONAL_DETAIL_FRIENDLY_MESSAGES.dob;
  if (!data.gender || !ALLOWED_GENDERS.has(data.gender.trim())) err.gender = PERSONAL_DETAIL_FRIENDLY_MESSAGES.gender;
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) err.email = PERSONAL_DETAIL_FRIENDLY_MESSAGES.email;
  if (!data.emergencyContactName || data.emergencyContactName.trim().length < 2) {
    err.emergencyContactName = PERSONAL_DETAIL_FRIENDLY_MESSAGES.emergencyContactName;
  }
  const phone = (data.emergencyContactPhone || "").replace(/\s/g, "");
  if (!/^\d{10}$/.test(phone)) err.emergencyContactPhone = PERSONAL_DETAIL_FRIENDLY_MESSAGES.emergencyContactPhone;
  return err;
}

export function personalDetailsRecordFromUser(user: UserProfile): Record<string, string> {
  const name = user.name && user.name !== "New Member" ? user.name : "";
  return {
    name,
    email: user.email ?? "",
    dob: user.dob ?? "",
    gender: user.gender ?? "",
    emergencyContactName: user.emergencyContactName ?? "",
    emergencyContactPhone: user.emergencyContactPhone ?? "",
    medicalConditions: user.medicalConditions ?? "",
  };
}

export function isProfileCompleteForStep1(user: UserProfile): boolean {
  return Object.keys(validatePersonalDetails(personalDetailsRecordFromUser(user))).length === 0;
}
