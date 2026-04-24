import mongoose from "mongoose";
import type { TransactionStatus } from "../../shared/schema.js";

interface ITransactionDoc {
  _id: mongoose.Types.ObjectId;
  orderId: string;
  paymentId?: string | null;
  signature?: string | null;
  userId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  receipt: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const transactionSchema = new mongoose.Schema<ITransactionDoc>(
  {
    orderId: { type: String, required: true },
    paymentId: { type: String, default: null },
    signature: { type: String, default: null },
    userId: { type: String, required: true, ref: "User" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "INR" },
    status: {
      type: String,
      required: true,
      default: "CREATED",
      enum: ["CREATED", "PENDING", "SUCCESS", "FAILED"] as TransactionStatus[],
    },
    receipt: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const TransactionModel = mongoose.model("Transaction", transactionSchema);
