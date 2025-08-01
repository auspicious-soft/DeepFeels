// 1. CompatibilityResultModel
import mongoose, { Schema, Document } from 'mongoose';

interface IAstroData {
  zodiacSign: string;
  personalityKeywords: string[];
  birthStar: string;
  sunSign: string;
}

interface ICompatibilityResult extends Document {
  userId: mongoose.Types.ObjectId;
  partner: {
    firstName: string;
    lastName: string;
    gender: string;
    dob: string;
    timeOfBirth: string;
    birthPlace: string;
  };
  result: {
    overallCompatibilityLabel: string;
    description: string;
    emotionalAndMentalCompatibility: {
      title: string;
      text: string;
    };
    astrologicalSupport: {
      you: IAstroData;
      partner: IAstroData;
    };
    compatibilityScore: number;
    summaryHighlights: {
      strengths: string[];
      challenges: string[];
      advice: string[];
    };
    generatedText: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const compatibilitySchema = new Schema<ICompatibilityResult>({
  userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  partner: {
    firstName: String,
    lastName: String,
    gender: String,
    dob: String,
    timeOfBirth: String,
    birthPlace: String,
  },
  result: Schema.Types.Mixed,
}, { timestamps: true });

export const CompatibilityResultModel = mongoose.model<ICompatibilityResult>('CompatibilityResult', compatibilitySchema);
