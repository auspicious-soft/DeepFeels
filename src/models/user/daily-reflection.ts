import mongoose, { Schema, Document } from "mongoose";

export interface IDailyReflection extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  date: Date;
  reflection: string;
  groundingTip: string;
  mantra: string;
}

const dailyReflectionSchema = new Schema<IDailyReflection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    title: { type: String, required: true },
    date: { type: Date, required: true },
    reflection: { type: String, required: true },
    groundingTip: { type: String, required: true },
    mantra: { type: String, required: true },
  },
  { timestamps: true }
);

dailyReflectionSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyReflectionModel = mongoose.model<IDailyReflection>(
  "dailyReflection",
  dailyReflectionSchema
);
