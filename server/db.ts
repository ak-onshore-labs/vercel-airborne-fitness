import mongoose from "mongoose";

function getConnectionString(): string {
  const connectionString =
    process.env.MONGODB_URI ||
    // process.env.DATABASE_URL ||
    (process.env.NODE_ENV !== "production"
      ? "mongodb://localhost:27017/airborne_fitness"
      : undefined);
  if (!connectionString) {
    throw new Error("MONGODB_URI or DATABASE_URL must be set.");
  }
  return connectionString;
}

declare global {
  // eslint-disable-next-line no-var
  var __airborneMongooseConnectPromise: Promise<typeof mongoose> | undefined;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!globalThis.__airborneMongooseConnectPromise) {
    const connectionString = getConnectionString();
    globalThis.__airborneMongooseConnectPromise = mongoose.connect(connectionString).then(async (conn) => {
      // Drop obsolete unique index on members.phone if present (schema no longer has phone; multiple nulls would violate unique).
      const db = mongoose.connection.db;
      if (db) {
        const coll = db.collection("members");
        await coll.dropIndex("phone_1").catch(() => {});
      }
      return conn;
    }).catch((err) => {
      globalThis.__airborneMongooseConnectPromise = undefined;
      throw err;
    });
  }

  return globalThis.__airborneMongooseConnectPromise;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  globalThis.__airborneMongooseConnectPromise = undefined;
}
