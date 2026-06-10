/**
 * Smoke test for claimEnrollmentTransaction with metadata: null.
 * Requires MONGODB_URI (loads .env by default).
 * Run: npx tsx script/test-claim-enrollment-transaction.ts
 */
import { config } from "dotenv";

const path = process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || ".env";
config({ path });

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const { connectDb, disconnectDb } = await import("../server/db.js");
const { storage } = await import("../server/storage.js");
const { TransactionModel } = await import("../server/models/index.js");

let testTxId: string | null = null;

try {
  await connectDb();

  const suffix = Date.now().toString(36);
  const doc = await TransactionModel.create({
    orderId: `test_claim_${suffix}`,
    userId: "000000000000000000000001",
    amount: 105,
    currency: "INR",
    status: "SUCCESS",
    receipt: `test_claim_${suffix}`.slice(0, 40),
    metadata: null,
  });
  testTxId = String(doc._id);

  const first = await storage.claimEnrollmentTransaction(testTxId);
  assert(first === "claimed", `first claim expected "claimed", got "${first}"`);

  const afterClaim = await TransactionModel.findById(testTxId).lean();
  assert(afterClaim?.metadata != null && typeof afterClaim.metadata === "object", "metadata must be an object after claim");
  assert(
    typeof (afterClaim.metadata as { enrollClaimedAt?: string }).enrollClaimedAt === "string" &&
      (afterClaim.metadata as { enrollClaimedAt: string }).enrollClaimedAt.length > 0,
    "enrollClaimedAt must be set after claim"
  );

  const second = await storage.claimEnrollmentTransaction(testTxId);
  assert(second === "in_progress", `second claim expected "in_progress", got "${second}"`);

  await storage.mergeTransactionMetadata(testTxId, {
    enrolledAt: new Date().toISOString(),
    membershipIds: ["000000000000000000000099"],
  });

  const third = await storage.claimEnrollmentTransaction(testTxId);
  assert(third === "complete", `third claim expected "complete", got "${third}"`);

  console.log("test-claim-enrollment-transaction: all assertions passed");
} finally {
  if (testTxId) {
    await TransactionModel.deleteOne({ _id: testTxId });
  }
  await disconnectDb();
}
