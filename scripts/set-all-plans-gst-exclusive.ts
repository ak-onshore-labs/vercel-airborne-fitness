import { config } from "dotenv";

const path = process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || ".env";
config({ path });

async function main(): Promise<void> {
  const { connectDb, disconnectDb } = await import("../server/db");
  const { MembershipPlanModel } = await import("../server/models");

  await connectDb();
  try {
    const inclusiveBefore = await MembershipPlanModel.countDocuments({ gstInclusive: true });
    const totalBefore = await MembershipPlanModel.countDocuments({});

    const result = await MembershipPlanModel.updateMany({}, { $set: { gstInclusive: false } });

    const inclusiveAfter = await MembershipPlanModel.countDocuments({ gstInclusive: true });

    console.log("GST exclusive migration complete");
    console.log(`Total plans: ${totalBefore}`);
    console.log(`Plans with gstInclusive=true before: ${inclusiveBefore}`);
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
    console.log(`Plans with gstInclusive=true after: ${inclusiveAfter}`);
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
