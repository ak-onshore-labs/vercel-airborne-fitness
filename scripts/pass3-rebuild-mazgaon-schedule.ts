/**
 * PASS 3: Rebuild Mazgaon schedule from source-of-truth dataset.
 *
 * Scope:
 * - Rebuild ONLY branch: "Mazgaon"
 * - Keep Lower Parel untouched
 * - Hard-fail if bookings exist
 *
 * Usage:
 * cross-env DOTENV_CONFIG_PATH=.env tsx scripts/pass3-rebuild-mazgaon-schedule.ts
 */
import { config } from "dotenv";

const path = process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || ".env";
config({ path });

type GenderRestriction = "NONE" | "FEMALE_ONLY";

type SourceRow = {
  classTypeName: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  genderRestriction: GenderRestriction;
};

const BRANCH_MAZGAON = "Mazgaon";
const BRANCH_LOWER_PAREL = "Lower Parel";
const DEFAULT_CAPACITY = 14;
const ALLOWED_GENDER_RESTRICTIONS = new Set<GenderRestriction>(["NONE", "FEMALE_ONLY"]);

const REQUIRED_CLASS_TYPES = [
  "Aerial Fitness",
  "Aerial Silk & Hoop",
  "Functional Training",
  "Kids Aerial Fitness",
  "Mat Pilates",
  "Trampoline Fitness",
  "Dance Fitness",
  "Yoga",
] as const;

const SOURCE_ROWS: SourceRow[] = [
  // Functional Training
  { classTypeName: "Functional Training", dayOfWeek: 1, startHour: 7, endHour: 8, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 1, startHour: 8, endHour: 9, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 1, startHour: 10, endHour: 11, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 1, startHour: 19, endHour: 20, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 3, startHour: 7, endHour: 8, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 3, startHour: 8, endHour: 9, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 3, startHour: 10, endHour: 11, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 3, startHour: 19, endHour: 20, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 5, startHour: 7, endHour: 8, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 5, startHour: 8, endHour: 9, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 5, startHour: 10, endHour: 11, genderRestriction: "NONE" },
  { classTypeName: "Functional Training", dayOfWeek: 5, startHour: 19, endHour: 20, genderRestriction: "NONE" },

  // Aerial Fitness
  { classTypeName: "Aerial Fitness", dayOfWeek: 1, startHour: 9, endHour: 10, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 3, startHour: 9, endHour: 10, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 5, startHour: 9, endHour: 10, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 2, startHour: 8, endHour: 9, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 2, startHour: 18, endHour: 19, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 2, startHour: 19, endHour: 20, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 4, startHour: 8, endHour: 9, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 4, startHour: 18, endHour: 19, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 4, startHour: 19, endHour: 20, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 6, startHour: 8, endHour: 9, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 6, startHour: 9, endHour: 10, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 0, startHour: 8, endHour: 9, genderRestriction: "NONE" },
  { classTypeName: "Aerial Fitness", dayOfWeek: 0, startHour: 9, endHour: 10, genderRestriction: "NONE" },

  // Kids Aerial Fitness
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 1, startHour: 17, endHour: 18, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 2, startHour: 17, endHour: 18, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 3, startHour: 17, endHour: 18, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 4, startHour: 17, endHour: 18, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 5, startHour: 17, endHour: 18, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 6, startHour: 11, endHour: 12, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 6, startHour: 12, endHour: 13, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 0, startHour: 11, endHour: 12, genderRestriction: "NONE" },
  { classTypeName: "Kids Aerial Fitness", dayOfWeek: 0, startHour: 12, endHour: 13, genderRestriction: "NONE" },

  // Aerial Silk & Hoop
  { classTypeName: "Aerial Silk & Hoop", dayOfWeek: 6, startHour: 10, endHour: 11, genderRestriction: "NONE" },
  { classTypeName: "Aerial Silk & Hoop", dayOfWeek: 0, startHour: 10, endHour: 11, genderRestriction: "NONE" },

  // Mat Pilates
  { classTypeName: "Mat Pilates", dayOfWeek: 1, startHour: 11, endHour: 12, genderRestriction: "NONE" },
  { classTypeName: "Mat Pilates", dayOfWeek: 3, startHour: 11, endHour: 12, genderRestriction: "NONE" },
  { classTypeName: "Mat Pilates", dayOfWeek: 5, startHour: 11, endHour: 12, genderRestriction: "NONE" },
  { classTypeName: "Mat Pilates", dayOfWeek: 2, startHour: 9, endHour: 10, genderRestriction: "FEMALE_ONLY" },
  { classTypeName: "Mat Pilates", dayOfWeek: 4, startHour: 9, endHour: 10, genderRestriction: "FEMALE_ONLY" },

  // Trampoline Fitness
  { classTypeName: "Trampoline Fitness", dayOfWeek: 2, startHour: 10, endHour: 11, genderRestriction: "NONE" },
  { classTypeName: "Trampoline Fitness", dayOfWeek: 4, startHour: 10, endHour: 11, genderRestriction: "NONE" },

  // Dance Fitness
  { classTypeName: "Dance Fitness", dayOfWeek: 1, startHour: 18, endHour: 19, genderRestriction: "NONE" },
  { classTypeName: "Dance Fitness", dayOfWeek: 3, startHour: 18, endHour: 19, genderRestriction: "NONE" },
  { classTypeName: "Dance Fitness", dayOfWeek: 5, startHour: 18, endHour: 19, genderRestriction: "NONE" },
  { classTypeName: "Dance Fitness", dayOfWeek: 2, startHour: 7, endHour: 8, genderRestriction: "NONE" },
  { classTypeName: "Dance Fitness", dayOfWeek: 4, startHour: 7, endHour: 8, genderRestriction: "NONE" },

  // Yoga
  { classTypeName: "Yoga", dayOfWeek: 2, startHour: 16, endHour: 17, genderRestriction: "NONE" },
  { classTypeName: "Yoga", dayOfWeek: 4, startHour: 16, endHour: 17, genderRestriction: "NONE" },
  { classTypeName: "Yoga", dayOfWeek: 6, startHour: 16, endHour: 17, genderRestriction: "NONE" },
];

async function loadModels(): Promise<{
  connectDb: () => Promise<typeof import("mongoose")>;
  disconnectDb: () => Promise<void>;
  BookingModel: typeof import("../server/models").BookingModel;
  ClassTypeModel: typeof import("../server/models").ClassTypeModel;
  ScheduleSlotModel: typeof import("../server/models").ScheduleSlotModel;
}> {
  const db = await import("../server/db");
  const models = await import("../server/models");
  return {
    connectDb: db.connectDb,
    disconnectDb: db.disconnectDb,
    BookingModel: models.BookingModel,
    ClassTypeModel: models.ClassTypeModel,
    ScheduleSlotModel: models.ScheduleSlotModel,
  };
}

function fail(message: string): never {
  console.error(`\nPASS3 ABORT: ${message}\n`);
  throw new Error(message);
}

function validateSourceRows(rows: SourceRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!Number.isInteger(row.dayOfWeek) || row.dayOfWeek < 0 || row.dayOfWeek > 6) {
      fail(`Invalid dayOfWeek for ${row.classTypeName}: ${row.dayOfWeek}. Must be 0..6.`);
    }
    if (!Number.isInteger(row.startHour) || row.startHour < 0 || row.startHour > 23) {
      fail(`Invalid startHour for ${row.classTypeName}: ${row.startHour}. Must be 0..23.`);
    }
    if (!Number.isInteger(row.endHour) || row.endHour < 1 || row.endHour > 24) {
      fail(`Invalid endHour for ${row.classTypeName}: ${row.endHour}. Must be 1..24.`);
    }
    if (row.endHour <= row.startHour) {
      fail(
        `Invalid time range for ${row.classTypeName} day=${row.dayOfWeek}: endHour (${row.endHour}) must be after startHour (${row.startHour}).`
      );
    }
    if (!ALLOWED_GENDER_RESTRICTIONS.has(row.genderRestriction)) {
      fail(`Invalid genderRestriction for ${row.classTypeName}: ${String(row.genderRestriction)}`);
    }
    const key = `${row.classTypeName}|${row.dayOfWeek}|${row.startHour}|${row.endHour}`;
    if (seen.has(key)) {
      fail(`Duplicate source row detected: ${key}`);
    }
    seen.add(key);
  }
}

async function main(): Promise<void> {
  console.log("PASS 3: Mazgaon schedule rebuild\n");
  const { connectDb, disconnectDb, BookingModel, ClassTypeModel, ScheduleSlotModel } = await loadModels();
  await connectDb();

  validateSourceRows(SOURCE_ROWS);
  const expectedRows = SOURCE_ROWS.length;

  const bookingsBefore = await BookingModel.countDocuments();
  if (bookingsBefore !== 0) {
    fail(`bookings count must be 0 before PASS 3 (found ${bookingsBefore}).`);
  }

  const lowerParelBefore = await ScheduleSlotModel.countDocuments({ branch: BRANCH_LOWER_PAREL });

  const classTypeDocs = await ClassTypeModel.find({}).lean();
  const classTypeNameToId = new Map<string, string>();
  for (const doc of classTypeDocs as Array<{ _id: unknown; name?: string }>) {
    if (typeof doc.name === "string" && doc.name.trim()) {
      classTypeNameToId.set(doc.name.trim(), String(doc._id));
    }
  }

  for (const requiredName of REQUIRED_CLASS_TYPES) {
    if (!classTypeNameToId.get(requiredName)) {
      fail(`Missing required class type: ${requiredName}`);
    }
  }

  const insertDocs = SOURCE_ROWS.map((row) => {
    const classTypeId = classTypeNameToId.get(row.classTypeName);
    if (!classTypeId) fail(`Missing classTypeId mapping for row classTypeName=${row.classTypeName}`);
    return {
      classTypeId,
      branch: BRANCH_MAZGAON,
      dayOfWeek: row.dayOfWeek,
      startHour: row.startHour,
      startMinute: 0,
      endHour: row.endHour,
      endMinute: 0,
      capacity: DEFAULT_CAPACITY,
      isActive: true,
      genderRestriction: row.genderRestriction,
    };
  });

  // Enforce duplicate detection using the exact insertion identity key (classTypeId + day + time).
  const insertKeySeen = new Set<string>();
  for (const doc of insertDocs) {
    const key = `${doc.classTypeId}|${doc.dayOfWeek}|${doc.startHour}|${doc.startMinute}|${doc.endHour}|${doc.endMinute}`;
    if (insertKeySeen.has(key)) {
      fail(`Duplicate row detected after class type mapping: ${key}`);
    }
    insertKeySeen.add(key);
  }

  const deleteResult = await ScheduleSlotModel.deleteMany({ branch: BRANCH_MAZGAON });
  const deletedMazgaonRowsCount = deleteResult.deletedCount ?? 0;

  const inserted = await ScheduleSlotModel.insertMany(insertDocs);
  const insertedMazgaonRowsCount = inserted.length;

  const bookingsAfter = await BookingModel.countDocuments();
  const lowerParelAfter = await ScheduleSlotModel.countDocuments({ branch: BRANCH_LOWER_PAREL });
  const finalMazgaonCount = await ScheduleSlotModel.countDocuments({ branch: BRANCH_MAZGAON });
  const distinctBranches = await ScheduleSlotModel.distinct("branch");

  let validationStatus: "PASS" | "FAIL" = "PASS";
  if (bookingsAfter !== 0) validationStatus = "FAIL";
  if (lowerParelAfter !== lowerParelBefore) validationStatus = "FAIL";
  if (finalMazgaonCount !== expectedRows) validationStatus = "FAIL";
  if (!distinctBranches.includes(BRANCH_LOWER_PAREL) || !distinctBranches.includes(BRANCH_MAZGAON)) {
    validationStatus = "FAIL";
  }
  if (insertedMazgaonRowsCount !== expectedRows) validationStatus = "FAIL";

  console.log("========== PASS 3 REPORT ==========");
  console.log(`expectedRows: ${expectedRows}`);
  console.log(`deletedMazgaonRowsCount: ${deletedMazgaonRowsCount}`);
  console.log(`insertedMazgaonRowsCount: ${insertedMazgaonRowsCount}`);
  console.log(`lowerParelBefore: ${lowerParelBefore}`);
  console.log(`lowerParelAfter: ${lowerParelAfter}`);
  console.log(`finalMazgaonCount: ${finalMazgaonCount}`);
  console.log(`validationStatus: ${validationStatus}`);
  console.log("===================================");

  if (validationStatus !== "PASS") {
    fail("Post-validation checks failed.");
  }

  await disconnectDb();
  console.log("PASS 3 completed successfully.");
}

main().catch(async (err) => {
  console.error(err);
  try {
    const db = await import("../server/db");
    await db.disconnectDb();
  } catch {
    // ignore disconnect failure in catch
  }
  process.exit(1);
});
