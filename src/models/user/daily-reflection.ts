import mongoose, { Schema, Document } from "mongoose";

export interface IDailyReflection extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  date: string;
  reflection: string;
  groundingTip: string;
  mantra: string;
  todayEnergy:string;
  emotionalTheme:string;
  suggestedFocus:string;
  userDescription:string|null;
  result:any;
  natalData:any;
  transitReflections:any;
  majorTransits:any;
  dailyPrediction:any;
}

const dailyReflectionSchema = new Schema<IDailyReflection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    groundingTip: { type: String, required: true },
    mantra: { type: String, required: true },
    todayEnergy:{type: String, required: true},
    emotionalTheme:{type: String, required: true},
    suggestedFocus:{type: String, required: true},
    transitReflections:{
      type : Schema.Types.Mixed,
      default:null
    },
    majorTransits:{
      type : Schema.Types.Mixed,
      default:null
    },
    result:{
      type:Schema.Types.Mixed,
      required:true
    },
    dailyPrediction:{
      type:Schema.Types.Mixed,
      default:true
    }
  },
  { timestamps: true }
);

dailyReflectionSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyReflectionModel = mongoose.model<IDailyReflection>(
  "dailyReflection",
  dailyReflectionSchema
);
