import { config } from "dotenv";

const path = process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || ".env";
config({ path });

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[\/&]+/g, " ")
    .replace(/\s+/g, " ");
}

function isWalkinTrialVariant(rawName: string): boolean {
  const normalized = normalizeName(rawName);
  const hasWalkin = /\bwalk\s*in\b/.test(normalized) || /\bwalkin\b/.test(normalized);
  const hasTrial = /\btrial\b/.test(normalized);
  return hasWalkin || hasTrial;
}

async function main(): Promise<void> {
  const { connectDb, disconnectDb } = await import("../server/db");
  const { MembershipPlanModel, ClassTypeModel } = await import("../server/models");

  await connectDb();
  try {
    const allPlans = await MembershipPlanModel.find({}).lean();
    const classTypeIds = Array.from(new Set(allPlans.map((p: any) => String(p.classTypeId))));
    const classTypes = await ClassTypeModel.find({ _id: { $in: classTypeIds } }).lean();
    const classTypeNameById = new Map<string, string>(
      classTypes.map((ct: any) => [String(ct._id), String(ct.name ?? "")])
    );

    const inclusiveIds: string[] = [];
    const exclusiveIds: string[] = [];
    for (const plan of allPlans as any[]) {
      if (isWalkinTrialVariant(String(plan.name ?? ""))) inclusiveIds.push(String(plan._id));
      else exclusiveIds.push(String(plan._id));
    }

    const [inclusiveRes, exclusiveRes] = await Promise.all([
      MembershipPlanModel.updateMany(
        { _id: { $in: inclusiveIds } },
        { $set: { gstInclusive: true } }
      ),
      MembershipPlanModel.updateMany(
        { _id: { $in: exclusiveIds } },
        { $set: { gstInclusive: false } }
      ),
    ]);

    const updated = await MembershipPlanModel.find({}).lean();
    const inclusivePlans = (updated as any[])
      .filter((p) => p.gstInclusive === true)
      .map((p) => ({
        id: String(p._id),
        classTypeName: classTypeNameById.get(String(p.classTypeId)) ?? String(p.classTypeId),
        name: String(p.name ?? ""),
      }))
      .sort((a, b) => {
        const byClass = a.classTypeName.localeCompare(b.classTypeName, "en");
        if (byClass !== 0) return byClass;
        return a.name.localeCompare(b.name, "en");
      });
    const inclusiveCount = inclusivePlans.length;
    const exclusiveCount = updated.length - inclusiveCount;

    console.log("GST migration complete");
    console.log(`Total plans: ${updated.length}`);
    console.log(`Inclusive plans (gstInclusive=true): ${inclusiveCount}`);
    console.log(`Exclusive plans (gstInclusive=false): ${exclusiveCount}`);
    console.log(`Matched/updated to inclusive: ${inclusiveRes.modifiedCount}`);
    console.log(`Matched/updated to exclusive: ${exclusiveRes.modifiedCount}`);
    console.log("Inclusive plan list:");
    for (const plan of inclusivePlans) {
      console.log(`- ${plan.classTypeName} :: ${plan.name} (${plan.id})`);
    }
  } finally {
    await disconnectDb();
  }
}

main().catch(async (err) => {
  console.error(err);
  try {
    const { disconnectDb } = await import("../server/db");
    await disconnectDb();
  } catch {
    // noop
  }
  process.exit(1);
});
