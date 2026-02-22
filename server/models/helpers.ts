import type { Document } from "mongoose";

/** Convert Mongoose document to plain object with `id` from `_id` for API compatibility */
export function toDoc<T extends Document>(doc: T | null): (Omit<T, "_id"> & { id: string }) | null {
  if (!doc) return null;
  const obj = doc.toObject() as Record<string, unknown>;
  const { _id, ...rest } = obj;
  return { ...rest, id: String(_id) } as Omit<T, "_id"> & { id: string };
}

export function toDocRequired<T extends Document>(doc: T | null): Omit<T, "_id"> & { id: string } {
  const out = toDoc(doc);
  if (!out) throw new Error("Document not found");
  return out;
}
