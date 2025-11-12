// models/dailyMoodModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IDailyMoodSummary extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // represents that specific day
  summary: string;
  createdAt: Date;
  lastSevenMoods:any;
}

const dailyMoodSchema = new Schema<IDailyMoodSummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    summary: { type: String, required: true },
    lastSevenMoods: [
    {
      _id: String,
      mood: String,
      note: String,
      date: String,
    },
  ],
  },
  { timestamps: true }
);

dailyMoodSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyMoodModel = mongoose.model<IDailyMoodSummary>(
  "DailyMoodSummary",
  dailyMoodSchema
);
