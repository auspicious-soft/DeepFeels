import mongoose, { Document, Schema } from "mongoose";
import { genders } from "src/utils/constant";

export interface IUserInfo extends Document {
  userId: mongoose.Types.ObjectId;
  dob?: Date;
  timeOfBirth?:string;
  birthPlace?:string;
  createdAt?: Date;
  updatedAt?: Date;
  journalEncryption?:boolean;
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
  journalEncryption:{
    type: Boolean,
    default: false,
  },
},
  { timestamps: true }
);

// Ensure virtuals show up in toJSON and toObject
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export const UserInfoModel = mongoose.model<IUserInfo>("userInfo", userSchema);