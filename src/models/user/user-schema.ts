import mongoose, { Document, Schema } from "mongoose";
import { authTypes, countries, } from "src/utils/constant";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  image?: string;
  fcmToken?: string | null;
  authType: "EMAIL" | "GOOGLE" | "APPLE";
  countryCode?: string;
  phone?: string;
  isVerifiedEmail: boolean;
  isVerifiedPhone: boolean;
  isUserInfoComplete: boolean;
  isDeleted: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  createdForVerificationAt?: Date;
  stripeCustomerId?: string;
  isCardSetupComplete?: boolean;
  hasUsedTrial?: boolean;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authType === "EMAIL";
      },
    },
    image: {
      type: String,
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    authType: {
      type: String,
      enum: authTypes,
      default: "EMAIL",
    },
    countryCode: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
    isVerifiedEmail: {
      type: Boolean,
      default: false,
    },
    isVerifiedPhone: {
      type: Boolean,
      default: false,
    },
    isUserInfoComplete: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },

    createdForVerificationAt: {
      type: Date,
      default: function (this: IUser) {
        return !this.isVerifiedEmail ? new Date() : undefined;
      },
      index: {
        expireAfterSeconds: 600,
        partialFilterExpression: { isVerifiedEmail: false },
      },
    },

    stripeCustomerId: {
      type: String,
      default: null,
    },

    isCardSetupComplete: {
      type: Boolean,
      default: false,
    },

    hasUsedTrial: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("user", userSchema);
