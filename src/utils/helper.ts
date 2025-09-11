import bcrypt from "bcryptjs";
import { OtpModel } from "src/models/system/otp-schema";
import { otpPurpose } from "./constant";
import { Resend } from "resend";
import { configDotenv } from "dotenv";
import SignupVerification from "./email-templates/signup-verification";
import ForgotPasswordVerification from "./email-templates/forget-password-verification";
import { customMessages, SupportedLang } from "./messages";
import { IUser } from "src/models/user/user-schema";
import jwt from "jsonwebtoken";
import { TokenModel } from "src/models/user/token-schema";
import axios from "axios";
import jwkToPem from "jwk-to-pem";
import { DateTime } from "luxon";

configDotenv();
const resend = new Resend(process.env.RESEND_API_KEY);

export function getTranslatedGender(gender: string, lang: string) {
  const translations = {
    en: { male: "Male", female: "Female", other: "Other" },
    nl: { male: "Man", female: "Vrouw", other: "Anders" },
    fr: { male: "Homme", female: "Femme", other: "Autre" },
    es: { male: "Hombre", female: "Mujer", other: "Otro" },
  };
  type GenderKeys = "male" | "female" | "other";
  return (
    translations[lang as "en" | "nl" | "fr" | "es"]?.[gender as GenderKeys] ||
    gender
  );
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashPassword: string) {
  return await bcrypt.compare(password, hashPassword);
}

export async function generateToken(user: IUser) {
  const tokenPayload = {
    id: user._id,
    email: user.email || null,
    phone: user.phone || null,
    fullName: user.fullName,
    image: user.image,
    role: user.role,
    language: "en",
    countryCode: user.countryCode,
  };

  const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET as string, {
    expiresIn: "60d",
  });

  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  await TokenModel.deleteMany({ userId: user._id });
  await TokenModel.create({
    token,
    userId: user._id,
    expiresAt,
  });

  return token;
}

export async function generateAndSendOtp(
  value: string,
  purpose: string,
  type: string,
  language: SupportedLang,
  userType: string
) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (!otpPurpose.includes(purpose) || !["EMAIL", "PHONE"].includes(type)) {
    throw new Error("Invalid Otp Purpose Or Otp Type");
  }

  const checkExist = await OtpModel.findOne({
    email: type === "EMAIL" ? value : null,
    phone: type === "EMAIL" ? null : value,
    type,
    purpose,
    userType,
  });

  if (checkExist) {
    await OtpModel.findByIdAndDelete(checkExist._id);
  }

  await OtpModel.create({
    email: type === "EMAIL" ? value : null,
    phone: type === "EMAIL" ? null : value,
    type,
    purpose,
    code: otp,
    userType,
  });

  if (type === "EMAIL") {
    await resend.emails.send({
      from: process.env.COMPANY_RESEND_GMAIL_ACCOUNT as string,
      to: value,
      subject:
        purpose === "SIGNUP"
          ? customMessages[language]?.["subjectEmailVerification"]
          : customMessages[language]?.["subjectResetPassword"],
      react:
        purpose === "SIGNUP"
          ? SignupVerification({ otp: otp, language: "en" })
          : ForgotPasswordVerification({ otp: otp, language: "en" }),
    });
  }

  return otp;
}
export async function verifyAppleToken(idToken: string) {
  const appleKeys = await axios.get("https://appleid.apple.com/auth/keys");
  const decodedHeader: any = jwt.decode(idToken, { complete: true })?.header;
  const key = appleKeys.data.keys.find((k: any) => k.kid === decodedHeader.kid);
  if (!key) throw new Error("Apple public key not found");

  const pubKey = jwkToPem(key);
  const payload: any = jwt.verify(idToken, pubKey, {
    algorithms: ["RS256"],
  });

  if (payload.iss !== "https://appleid.apple.com") {
    throw new Error("Invalid Apple token issuer");
  }

  return payload;
}

export async function convertToUTC(dateString:string, timeZone:string) {
  // Parse date string in the given time zone
  const zonedDate = DateTime.fromISO(dateString, { zone: timeZone });

  if (!zonedDate.isValid) {
    throw new Error("Invalid date or time zone");
  }

  // Convert to UTC and return ISO string
  return zonedDate.toUTC().toISO();
}

export async function convertUTCToLocal(utcDateString: string, timeZone: string) {
  // Parse the UTC date
  const utcDate = DateTime.fromISO(utcDateString, { zone: 'utc' });
  
  if (!utcDate.isValid) {
    throw new Error("Invalid UTC date");
  }
  
  // Convert to the specified time zone
  const localDate = utcDate.setZone(timeZone);
  
  if (!localDate.isValid) {
    throw new Error("Invalid time zone");
  }
  
  // Return in YYYY-MM-DD format
  return localDate.toFormat('yyyy-MM-dd');
}