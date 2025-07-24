import mongoose, { Schema, Document } from "mongoose";

// "en", "nl", "fr", "es"

interface TranslatedText {
  en?: string;
  nl?: string;
  fr?: string;
  es?: string;
}

interface BenefitObject {
  unlimitedJournalEntries?: boolean;
  dailyGuidance?: boolean;
  compatibilityInsightUnlimited?: boolean;
  personalizedPushNotification?: boolean;
  weeklyEmotionalReport?: boolean;
}

const BenefitObjectSchema = new Schema(
  {
    unlimitedJournalEntries: { type: Boolean, default: false },
    dailyGuidance: { type: Boolean, default: false },
    compatibilityInsightUnlimited: { type: Boolean, default: false },
    personalizedPushNotification: { type: Boolean, default: false },
    weeklyEmotionalReport: { type: Boolean, default: false },
  },
  { _id: false }
);


export interface IPlan extends Document {
  key: string; // e.g., 'basic', 'pro', 'premium'
  name: TranslatedText;
  description: TranslatedText;
  features: TranslatedText[];
  trialDays: number;
  stripeProductId: string;
  stripePrices: {
    eur: string;
    gbp: string;
  };
  amounts: number;

  fullAccess: BenefitObject;
  trialAccess: BenefitObject;
  isActive: boolean;
}

const PlanSchema = new Schema<IPlan>({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  features: [
    {
      type: String,
      required: true,
    },
  ],
  trialDays: { type: Number, default: 14 },
  stripeProductId: { type: String, required: true },
  stripePrices: {
    type: String,
    required: true,
  },
  amounts: {
    type: Number,
    required: true,
  },
  fullAccess: { type: BenefitObjectSchema, default: {} },
  trialAccess: { type: BenefitObjectSchema, default: {} },
  isActive: {
    type: Boolean,
    default: true,
  },
});

export const planModel = mongoose.model<IPlan>("plan", PlanSchema);
