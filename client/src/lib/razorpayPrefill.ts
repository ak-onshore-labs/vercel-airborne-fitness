/** Matches PersonalDetails email validation in Enroll.tsx */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns a 10-digit Indian mobile string for Razorpay `prefill.contact`, or null if invalid.
 * Only the logged-in account mobile should be passed — never emergency contact numbers.
 */
export function normalizePhoneForRazorpayPrefill(phone: string | undefined | null): string | null {
  if (phone == null || typeof phone !== "string") return null;
  let d = phone.replace(/\s/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (!/^\d{10}$/.test(d)) return null;
  return d;
}

/**
 * Prefer enrollment email, then profile email; return null if neither is valid (omit prefill.email).
 */
export function resolvePrefillEmail(
  formDataEmail: string,
  userEmail: string | undefined | null
): string | null {
  const trimmedForm = formDataEmail?.trim() ?? "";
  if (trimmedForm && EMAIL_RE.test(trimmedForm)) return trimmedForm;
  const trimmedUser = userEmail?.trim() ?? "";
  if (trimmedUser && EMAIL_RE.test(trimmedUser)) return trimmedUser;
  return null;
}

export type RazorpayCheckoutPrefill = { contact?: string; email?: string };

/**
 * Builds Razorpay `prefill` only with valid values; returns undefined if nothing to send.
 */
export function buildRazorpayCheckoutPrefill(params: {
  accountPhone: string | undefined | null;
  formDataEmail: string;
  userEmail: string | undefined | null;
}): RazorpayCheckoutPrefill | undefined {
  const contact = normalizePhoneForRazorpayPrefill(params.accountPhone);
  const email = resolvePrefillEmail(params.formDataEmail, params.userEmail);
  if (!contact && !email) return undefined;
  const out: RazorpayCheckoutPrefill = {};
  if (contact) out.contact = contact;
  if (email) out.email = email;
  return out;
}
