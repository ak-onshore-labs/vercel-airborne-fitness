import mongoose from "mongoose";

const connectionString =
  process.env.MONGODB_URI ||
  // process.env.DATABASE_URL ||
  (process.env.NODE_ENV !== "production"
    ? "mongodb://localhost:27017/airborne_fitness"
    : undefined);

console.log("connectionString", connectionString);
if (!connectionString) {
  throw new Error("MONGODB_URI or DATABASE_URL must be set.");
}

export async function connectDb(): Promise<typeof mongoose> {
  return mongoose.connect(connectionString);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
