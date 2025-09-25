import mongoose, { Document, Schema } from "mongoose";
import { genders } from "src/utils/constant";

export interface IUserInfo extends Document {
  userId: mongoose.Types.ObjectId;
  dob?: string;
  timeOfBirth?: string;
  birthPlace?: string;
  createdAt?: Date;
  updatedAt?: Date;
  journalEncryption?: boolean;
  gender?: string;
  zodiacSign?: string;
  sunSign?: string;
  moonSign?: string;
  birthStar?: string;
  personalityKeywords?:string[]
  risingStar:string;
  timeZone?:string;
  birthTimezoneOffset?:number;
  dobUTC?:string;
  birthTimezoneOffsetName?:string;
  aspectsData?:object;
  housesData?:object;
  planetsData?:object;
  timezoneOffset?:any;
  ascendantDegree?:number;
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
      type: String,
      default: null,
    },
    timeOfBirth: {
      type: String,
      default: null,
    },
    birthPlace: {
      type: String,
      default: null,
    },
    journalEncryption: {
      type: Boolean,
      default: false,
    },
    gender: {
      type: String,
      enum: ["male", "female","other"],
      default:null,
    },
    zodiacSign: {
      type: String,
      default: null,
    },
    sunSign: {
      type: String,
      default: null,
    },
    moonSign: {
      type: String,
      default: null,
    },
    risingStar:{
      type: String,
      default: null,
    },
    timeZone:{
      type: String,
      default: null,
    },
    birthTimezoneOffset:{
      type:Number,
      default:null
    },
    dobUTC:{
      type: Date,
      default: null
    },
    birthTimezoneOffsetName:{
      type:String,
      default:null
    },
    ascendantDegree:{
      type: Number,
      default: null
    },
    planetsData:{
      type: Object,
      default: null
    },
    housesData:{
      type: Object,
      default: null
    },
    aspectsData:{
      type: Object,
      default: null
    },
    timezoneOffset:{
      type:Schema.Types.Mixed,
      default:null
    },
    personalityKeywords:[
      {
        type: String,
        default: [],
      },
    ]
  },
  { timestamps: true }
);

// Ensure virtuals show up in toJSON and toObject
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export const UserInfoModel = mongoose.model<IUserInfo>("userInfo", userSchema);
