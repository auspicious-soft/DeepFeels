import mongoose, { Document, Schema } from "mongoose";
import { genders } from "src/utils/constant";

export interface IUserInfo extends Document {
  userId: mongoose.Types.ObjectId;
  dob?: Date;
  timeOfBirth?:string;
  birthPlace?:string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUserInfo>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    timeOfBirth: {
      type:String,
      default:null,
  },
  birthPlace: {
    type:String,
    default:null,
  },
},
  { timestamps: true }
);

// Virtual: calculate age from DOB
userSchema.virtual("age").get(function (this: IUserInfo) {
  if (!this.dob) return null;
  const ageDifMs = Date.now() - this.dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// Ensure virtuals show up in toJSON and toObject
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export const UserInfoModel = mongoose.model<IUserInfo>("userInfo", userSchema);
