import mongoose from "mongoose";

const appSettingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // key
    value: { type: String, required: true },
  },
  { _id: true }
);

export const AppSettingModel = mongoose.model("AppSetting", appSettingSchema);
