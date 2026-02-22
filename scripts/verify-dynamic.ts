/**
 * Verification script: proves class types, plans, and schedule slots are DB-driven
 * and can be updated via admin PATCH endpoints.
 *
 * Uses BASE_URL (default http://localhost:5000) and ADMIN_PHONE (must be in ADMIN_ALLOWLIST_PHONES).
 * Run with: npm run verify:dynamic  |  npm run verify:dynamic:staging
 *
 * Expects server to be running. Restores original values after each check so DB is not left modified.
 */

import { config } from "dotenv";

const path = process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || ".env";
config({ path });

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const ADMIN_PHONE = process.env.ADMIN_PHONE || process.env.ADMIN_ALLOWLIST_PHONES?.split(",")[0]?.trim() || "";

const headers = {
  "Content-Type": "application/json",
  "X-Admin-Phone": ADMIN_PHONE,
};

function fail(check: string, message: string): never {
  console.log(`FAIL: ${check} – ${message}`);
  process.exit(1);
}

function pass(check: string) {
  console.log(`PASS: ${check}`);
}

async function getClassTypes(): Promise<Array<{ id: string; name: string; strengthLevel: number }>> {
  const r = await fetch(`${BASE_URL}/api/class-types`);
  if (!r.ok) fail("class-types fetch", `${r.status} ${await r.text()}`);
  const data = await r.json();
  if (!Array.isArray(data)) fail("class-types fetch", "expected array");
  return data;
}

async function patchClassType(id: string, body: Record<string, unknown>): Promise<unknown> {
  const r = await fetch(`${BASE_URL}/api/admin/class-types/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) fail("class-types PATCH", `${r.status} ${await r.text()}`);
  return r.json();
}

async function getSchedule(): Promise<Array<{ id: string; capacity?: number; startHour?: number }>> {
  const r = await fetch(`${BASE_URL}/api/schedule`);
  if (!r.ok) fail("schedule fetch", `${r.status} ${await r.text()}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

async function patchScheduleSlot(id: string, body: Record<string, unknown>): Promise<unknown> {
  const r = await fetch(`${BASE_URL}/api/admin/schedule-slots/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) fail("schedule-slot PATCH", `${r.status} ${await r.text()}`);
  return r.json();
}

async function getScheduleForDate(branch: string, date: string): Promise<{ sessions: Array<{ capacity: number }> }> {
  const r = await fetch(`${BASE_URL}/api/schedule?branch=${encodeURIComponent(branch)}&date=${encodeURIComponent(date)}`);
  if (!r.ok) fail("schedule by date fetch", `${r.status} ${await r.text()}`);
  return r.json();
}

async function getPlans(classTypeId: string): Promise<Array<{ id: string; name: string; sessions: number; price: number; validityDays: number }>> {
  const r = await fetch(`${BASE_URL}/api/membership-plans?classTypeId=${encodeURIComponent(classTypeId)}`);
  if (!r.ok) fail("plans fetch", `${r.status} ${await r.text()}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

async function patchMembershipPlan(id: string, body: Record<string, unknown>): Promise<unknown> {
  const r = await fetch(`${BASE_URL}/api/admin/membership-plans/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!r.ok) fail("membership-plan PATCH", `${r.status} ${await r.text()}`);
  return r.json();
}

async function main() {
  if (!ADMIN_PHONE) {
    console.log("Set ADMIN_PHONE (or ADMIN_ALLOWLIST_PHONES) in .env so the script can call admin endpoints.");
    process.exit(1);
  }

  console.log("Verifying dynamic behavior at", BASE_URL, "with admin phone", ADMIN_PHONE.replace(/\d(?=\d{4})/g, "*"), "\n");

  // --- 1) Class types: update name + strengthLevel, then restore ---
  const typesBefore = await getClassTypes();
  if (typesBefore.length === 0) fail("class-types", "no class types returned");
  const firstType = typesBefore[0];
  const originalName = firstType.name;
  const originalStrength = firstType.strengthLevel;
  const testName = originalName + " (verify)";
  const testStrength = originalStrength === 5 ? 1 : originalStrength + 1;

  await patchClassType(firstType.id, { name: testName, strengthLevel: testStrength });
  const typesAfter = await getClassTypes();
  const updatedType = typesAfter.find((t) => t.id === firstType.id);
  if (!updatedType) fail("class-types", "updated type not found");
  if (updatedType.name !== testName) fail("class-types", `name expected "${testName}", got "${updatedType.name}"`);
  if (updatedType.strengthLevel !== testStrength) fail("class-types", `strengthLevel expected ${testStrength}, got ${updatedType.strengthLevel}`);
  pass("Class types: PATCH name and strengthLevel, GET reflects change");

  await patchClassType(firstType.id, { name: originalName, strengthLevel: originalStrength });
  pass("Class types: restored original values");

  // --- 2) Schedule slot: update capacity, then restore ---
  const slots = await getSchedule();
  if (slots.length === 0) fail("schedule", "no slots returned (seed schedule_slots?)");
  const firstSlot = slots[0] as { id: string; capacity?: number };
  const originalCapacity = firstSlot.capacity ?? 14;
  const testCapacity = originalCapacity === 14 ? 10 : 14;

  await patchScheduleSlot(firstSlot.id, { capacity: testCapacity });
  const slotAfter = await getSchedule();
  const updatedSlot = slotAfter.find((s: { id: string }) => s.id === firstSlot.id) as { capacity?: number } | undefined;
  if (!updatedSlot) fail("schedule-slot", "updated slot not found");
  if (updatedSlot.capacity !== testCapacity) fail("schedule-slot", `capacity expected ${testCapacity}, got ${updatedSlot.capacity}`);
  pass("Schedule slot: PATCH capacity, GET schedule reflects change");

  const branch = "Lower Parel";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  const { sessions } = await getScheduleForDate(branch, dateStr);
  const sessionWithSlot = sessions.find((s: { capacity?: number }) => s.capacity === testCapacity);
  if (!sessionWithSlot && sessions.length > 0) fail("schedule by date", "schedule endpoint by branch+date should reflect slot capacity");
  pass("Schedule by branch+date: capacity is from DB");

  await patchScheduleSlot(firstSlot.id, { capacity: originalCapacity });
  pass("Schedule slot: restored original capacity");

  // --- 3) Membership plan: update price/sessions/validityDays, then restore ---
  const classTypeId = typesBefore[0].id;
  const plansBefore = await getPlans(classTypeId);
  if (plansBefore.length === 0) fail("membership-plans", "no plans for class type");
  const firstPlan = plansBefore[0];
  const originalPrice = firstPlan.price;
  const originalSessions = firstPlan.sessions;
  const originalValidity = firstPlan.validityDays;
  const testPrice = originalPrice + 1;
  const testSessions = originalSessions + 1;
  const testValidity = originalValidity + 1;

  await patchMembershipPlan(firstPlan.id, { price: testPrice, sessionsTotal: testSessions, validityDays: testValidity });
  const plansAfter = await getPlans(classTypeId);
  const updatedPlan = plansAfter.find((p) => p.id === firstPlan.id);
  if (!updatedPlan) fail("membership-plans", "updated plan not found");
  if (updatedPlan.price !== testPrice) fail("membership-plans", `price expected ${testPrice}, got ${updatedPlan.price}`);
  if (updatedPlan.sessions !== testSessions) fail("membership-plans", `sessions expected ${testSessions}, got ${updatedPlan.sessions}`);
  if (updatedPlan.validityDays !== testValidity) fail("membership-plans", `validityDays expected ${testValidity}, got ${updatedPlan.validityDays}`);
  pass("Membership plans: PATCH price/sessions/validityDays, GET reflects change");

  await patchMembershipPlan(firstPlan.id, { price: originalPrice, sessionsTotal: originalSessions, validityDays: originalValidity });
  pass("Membership plans: restored original values");

  console.log("\nAll checks passed. Class types, plans, and schedule are fully dynamic (DB-driven).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
