/**
 * PASS 2: Rebuild membership plans from source-of-truth dataset.
 * Preconditions: zero bookings; clears all memberships; rebuilds 8 class types; deactivates plans for other class types.
 *
 * Usage: cross-env DOTENV_CONFIG_PATH=.env tsx scripts/pass2-rebuild-membership-plans.ts
 *
 * Note: dotenv must run before importing `server/db.ts`, which reads MONGODB_URI at module load time.
 */
import { config } from "dotenv";

const path = process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || ".env";
config({ path });

async function loadModels(): Promise<{
  connectDb: () => Promise<typeof import("mongoose")>;
  disconnectDb: () => Promise<void>;
  BookingModel: typeof import("../server/models").BookingModel;
  ClassTypeModel: typeof import("../server/models").ClassTypeModel;
  MembershipModel: typeof import("../server/models").MembershipModel;
  MembershipPlanModel: typeof import("../server/models").MembershipPlanModel;
}> {
  const db = await import("../server/db");
  const models = await import("../server/models");
  return {
    connectDb: db.connectDb,
    disconnectDb: db.disconnectDb,
    BookingModel: models.BookingModel,
    ClassTypeModel: models.ClassTypeModel,
    MembershipModel: models.MembershipModel,
    MembershipPlanModel: models.MembershipPlanModel,
  };
}

function normalizeClassOrPlanName(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  s = s.replace(/\s*&\s*/g, " and ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

type PlanRow = { name: string; sessionsTotal: number; price: number };

const VALIDITY_BY_PLAN_NAME: Record<string, number> = {
  "Walk-in / Trial": 7,
  "4 Classes": 28,
  "8 Classes": 28,
  "Monthly (8 Sessions)": 35,
  "Monthly (12 Sessions)": 35,
  Quarterly: 98,
  "Six Monthly": 189,
  Yearly: 365,
};

/** Canonical Mongo ClassType.name → aliases to try (in order) for resolution */
const TARGET_CLASS_CONFIG: Array<{ canonicalName: string; aliases: string[]; plans: PlanRow[] }> = [
  {
    canonicalName: "Aerial Fitness",
    aliases: ["Aerial Fitness"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 1000 },
      { name: "4 Classes", sessionsTotal: 4, price: 3200 },
      { name: "Monthly (8 Sessions)", sessionsTotal: 8, price: 5600 },
      { name: "Quarterly", sessionsTotal: 24, price: 15600 },
      { name: "Six Monthly", sessionsTotal: 48, price: 30000 },
      { name: "Yearly", sessionsTotal: 96, price: 57600 },
    ],
  },
  {
    canonicalName: "Functional Training",
    aliases: ["Functional Training", "FTC"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 800 },
      { name: "4 Classes", sessionsTotal: 4, price: 2200 },
      { name: "8 Classes", sessionsTotal: 8, price: 4000 },
      { name: "Monthly (12 Sessions)", sessionsTotal: 12, price: 5400 },
      { name: "Quarterly", sessionsTotal: 36, price: 14400 },
      { name: "Six Monthly", sessionsTotal: 72, price: 27000 },
      { name: "Yearly", sessionsTotal: 144, price: 50400 },
    ],
  },
  {
    canonicalName: "Mat Pilates",
    aliases: ["Mat Pilates"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 800 },
      { name: "4 Classes", sessionsTotal: 4, price: 2800 },
      { name: "Monthly (8 Sessions)", sessionsTotal: 8, price: 5200 },
      { name: "Monthly (12 Sessions)", sessionsTotal: 12, price: 7800 },
      { name: "Quarterly", sessionsTotal: 24, price: 14400 },
      { name: "Six Monthly", sessionsTotal: 48, price: 27600 },
      { name: "Yearly", sessionsTotal: 96, price: 52800 },
    ],
  },
  {
    canonicalName: "Dance Fitness",
    aliases: ["Dance Fitness"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 800 },
      { name: "4 Classes", sessionsTotal: 4, price: 2000 },
      { name: "8 Classes", sessionsTotal: 8, price: 3600 },
      { name: "Monthly (12 Sessions)", sessionsTotal: 12, price: 5100 },
      { name: "Quarterly", sessionsTotal: 36, price: 14400 },
      { name: "Six Monthly", sessionsTotal: 72, price: 27000 },
      { name: "Yearly", sessionsTotal: 144, price: 50400 },
    ],
  },
  {
    canonicalName: "Trampoline Fitness",
    aliases: ["Trampoline Fitness"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 800 },
      { name: "4 Classes", sessionsTotal: 4, price: 3000 },
      { name: "Monthly (8 Sessions)", sessionsTotal: 8, price: 5200 },
      { name: "Quarterly", sessionsTotal: 24, price: 14400 },
      { name: "Six Monthly", sessionsTotal: 48, price: 27600 },
      { name: "Yearly", sessionsTotal: 96, price: 52800 },
    ],
  },
  {
    canonicalName: "Yoga",
    aliases: ["Yoga"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 800 },
      { name: "4 Classes", sessionsTotal: 4, price: 2200 },
      { name: "8 Classes", sessionsTotal: 8, price: 3600 },
      { name: "Monthly (12 Sessions)", sessionsTotal: 12, price: 5100 },
      { name: "Quarterly", sessionsTotal: 36, price: 14400 },
      { name: "Six Monthly", sessionsTotal: 72, price: 27000 },
      { name: "Yearly", sessionsTotal: 144, price: 50400 },
    ],
  },
  {
    canonicalName: "Kids Aerial Fitness",
    aliases: ["Kids Aerial Fitness"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 1000 },
      { name: "4 Classes", sessionsTotal: 4, price: 3400 },
      { name: "Monthly (8 Sessions)", sessionsTotal: 8, price: 6000 },
      { name: "Quarterly", sessionsTotal: 24, price: 16800 },
      { name: "Six Monthly", sessionsTotal: 48, price: 33600 },
      { name: "Yearly", sessionsTotal: 96, price: 64800 },
    ],
  },
  {
    canonicalName: "Aerial Silk & Hoop",
    aliases: ["Aerial Silk & Hoop", "Silk and Hoop", "Silk & Hoop"],
    plans: [
      { name: "Walk-in / Trial", sessionsTotal: 1, price: 1000 },
      { name: "4 Classes", sessionsTotal: 4, price: 3600 },
      { name: "Monthly (8 Sessions)", sessionsTotal: 8, price: 7000 },
      { name: "Quarterly", sessionsTotal: 24, price: 20400 },
      { name: "Six Monthly", sessionsTotal: 48, price: 39600 },
      { name: "Yearly", sessionsTotal: 96, price: 76800 },
    ],
  },
];

function fail(msg: string): never {
  console.error(`\nPASS2 ABORT: ${msg}\n`);
  throw new Error(msg);
}

function validityForPlanName(name: string): number {
  const v = VALIDITY_BY_PLAN_NAME[name];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    fail(`Missing validityDays mapping for plan name: ${JSON.stringify(name)}`);
  }
  return v;
}

async function buildClassTypeLookup(
  ClassTypeModel: typeof import("../server/models").ClassTypeModel
): Promise<Map<string, string>> {
  const docs = await ClassTypeModel.find({}).lean();
  const map = new Map<string, string>();
  for (const d of docs as Array<{ _id: unknown; name?: string }>) {
    const id = String(d._id);
    const name = typeof d.name === "string" ? d.name : "";
    const key = normalizeClassOrPlanName(name);
    if (!key) continue;
    if (map.has(key) && map.get(key) !== id) {
      fail(
        `Duplicate class type under normalized matching: "${key}" maps to multiple ids (${map.get(key)} vs ${id}). Raw names conflict.`
      );
    }
    map.set(key, id);
  }
  return map;
}

function resolveClassTypeId(
  lookup: Map<string, string>,
  canonicalName: string,
  aliases: string[]
): string {
  for (const alias of aliases) {
    const key = normalizeClassOrPlanName(alias);
    const id = lookup.get(key);
    if (id) return id;
  }
  fail(
    `Could not resolve ClassType for "${canonicalName}". Tried aliases: ${JSON.stringify(aliases)}`
  );
}

async function main(): Promise<void> {
  console.log("PASS 2: Membership plans rebuild\n");
  const { connectDb, disconnectDb, BookingModel, ClassTypeModel, MembershipModel, MembershipPlanModel } =
    await loadModels();
  await connectDb();

  const bookingCount = await BookingModel.countDocuments();
  if (bookingCount !== 0) {
    fail(`bookings count must be 0 before PASS 2 (found ${bookingCount}).`);
  }

  const memDel = await MembershipModel.deleteMany({});
  const deletedMembershipsCount = memDel.deletedCount ?? 0;
  const memAfter = await MembershipModel.countDocuments();
  if (memAfter !== 0) {
    fail(`Expected memberships.countDocuments() === 0 after delete (found ${memAfter}).`);
  }

  const lookup = await buildClassTypeLookup(ClassTypeModel);

  const perClassReports: Array<{
    classTypeName: string;
    classTypeId: string;
    deletedPlansCount: number;
    insertedPlansCount: number;
  }> = [];

  const targetClassTypeIds: string[] = [];

  for (const cfg of TARGET_CLASS_CONFIG) {
    const classTypeId = resolveClassTypeId(lookup, cfg.canonicalName, cfg.aliases);
    targetClassTypeIds.push(classTypeId);

    for (const row of cfg.plans) {
      const vd = VALIDITY_BY_PLAN_NAME[row.name];
      if (vd === undefined) {
        fail(`Plan "${row.name}" has no validity mapping.`);
      }
    }

    const delRes = await MembershipPlanModel.deleteMany({ classTypeId });
    const deletedPlansCount = delRes.deletedCount ?? 0;

    const docs = cfg.plans.map((row) => ({
      classTypeId,
      name: row.name,
      sessionsTotal: row.sessionsTotal,
      price: row.price,
      validityDays: validityForPlanName(row.name),
      isActive: true,
    }));

    const inserted = await MembershipPlanModel.insertMany(docs);
    const insertedPlansCount = inserted.length;
    if (insertedPlansCount !== cfg.plans.length) {
      fail(
        `Insert mismatch for ${cfg.canonicalName}: expected ${cfg.plans.length} inserted, got ${insertedPlansCount}`
      );
    }

    for (let i = 0; i < cfg.plans.length; i++) {
      const row = cfg.plans[i];
      const doc = inserted[i] as { name: string; sessionsTotal: number; price: number; validityDays: number };
      if (
        doc.name !== row.name ||
        doc.sessionsTotal !== row.sessionsTotal ||
        doc.price !== row.price ||
        doc.validityDays !== VALIDITY_BY_PLAN_NAME[row.name]
      ) {
        fail(`Inserted document mismatch for ${cfg.canonicalName} row ${row.name}`);
      }
    }

    perClassReports.push({
      classTypeName: cfg.canonicalName,
      classTypeId,
      deletedPlansCount,
      insertedPlansCount,
    });
  }

  const uniqueTargets = Array.from(new Set(targetClassTypeIds));
  if (uniqueTargets.length !== TARGET_CLASS_CONFIG.length) {
    fail(
      `Expected ${TARGET_CLASS_CONFIG.length} distinct target classTypeIds; got ${uniqueTargets.length} (duplicate resolution?)`
    );
  }

  const deactivateRes = await MembershipPlanModel.updateMany(
    { classTypeId: { $nin: uniqueTargets } },
    { $set: { isActive: false } }
  );
  const deactivatedPlansMatched = deactivateRes.matchedCount ?? 0;
  const deactivatedPlansCount = deactivateRes.modifiedCount ?? 0;

  const finalActivePlanCount = await MembershipPlanModel.countDocuments({ isActive: true });
  const expectedActiveTotal = TARGET_CLASS_CONFIG.reduce((s, c) => s + c.plans.length, 0);
  if (finalActivePlanCount !== expectedActiveTotal) {
    fail(
      `finalActivePlanCount expected ${expectedActiveTotal} (sum of PASS2 rows), got ${finalActivePlanCount}`
    );
  }

  const dupResults: Array<{ classTypeName: string; pass: boolean; detail: string }> = [];
  for (let i = 0; i < TARGET_CLASS_CONFIG.length; i++) {
    const cfg = TARGET_CLASS_CONFIG[i];
    const classTypeId = perClassReports[i].classTypeId;
    const agg = await MembershipPlanModel.aggregate<{ _id: string; c: number }>([
      { $match: { classTypeId } },
      { $group: { _id: "$name", c: { $sum: 1 } } },
      { $match: { c: { $gt: 1 } } },
    ]);
    if (agg.length > 0) {
      dupResults.push({
        classTypeName: cfg.canonicalName,
        pass: false,
        detail: agg.map((x) => `${x._id}:${x.c}`).join(", "),
      });
    } else {
      dupResults.push({ classTypeName: cfg.canonicalName, pass: true, detail: "no duplicates" });
    }
  }
  const duplicateValidationPass = dupResults.every((r) => r.pass);

  const badValidity = await MembershipPlanModel.countDocuments({
    isActive: true,
    $or: [{ validityDays: { $lte: 0 } }, { validityDays: { $exists: false } }],
  });
  const validityDaysValidationPass = badValidity === 0;

  console.log("========== PASS 2 REPORT ==========\n");
  console.log(`deletedMembershipsCount: ${deletedMembershipsCount}\n`);
  console.log("Per target class type:");
  for (const r of perClassReports) {
    console.log(
      `  - ${r.classTypeName} (${r.classTypeId}): deletedPlansCount=${r.deletedPlansCount}, insertedPlansCount=${r.insertedPlansCount}`
    );
  }
  console.log(
    `\ndeactivatedPlansCount (modified): ${deactivatedPlansCount}\ndeactivatedPlansMatched: ${deactivatedPlansMatched}\n`
  );
  console.log(`finalActivePlanCount: ${finalActivePlanCount}\n`);
  console.log("Duplicate plan name validation (per target class):");
  for (const r of dupResults) {
    console.log(`  - ${r.classTypeName}: ${r.pass ? "PASS" : "FAIL"} (${r.detail})`);
  }
  console.log(
    `\nvalidityDays validation (all active plans have validityDays > 0): ${validityDaysValidationPass ? "PASS" : "FAIL"} (badCount=${badValidity})\n`
  );

  console.log("----- seed.ts legacy warning -----");
  console.log(
    "server/seed.ts still defines legacy plan names (e.g. Walk-in/Trial, Monthly, 3 Months). Update it in a follow-up PR so RESET_SEED / fresh installs do not resurrect pre-PASS2 plans.\n"
  );
  console.log("==================================\n");

  if (!duplicateValidationPass) {
    fail("Duplicate plan name validation failed for one or more target classes.");
  }
  if (!validityDaysValidationPass) {
    fail("validityDays validation failed: some active plans have missing or non-positive validityDays.");
  }

  await disconnectDb();
  console.log("PASS 2 completed successfully.");
}

main().catch(async (err) => {
  console.error(err);
  try {
    await disconnectDb();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
