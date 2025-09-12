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

export function convertToUTC(dateString: string, timeString: string, timezone: string): Date {
  try {
    // Combine date and time strings
    const dateTimeString = `${dateString}T${timeString}`;
    
    // Parse the date/time in the specified timezone
    const dt = DateTime.fromISO(dateTimeString, { zone: timezone });
    
    if (!dt.isValid) {
      throw new Error(`Invalid date/time: ${dt.invalidExplanation}`);
    }
    
    // Convert to UTC and return as JavaScript Date object
    return dt.toUTC().toJSDate();
  } catch (error) {
    throw new Error(`Invalid date/time or timezone: ${error}`);
  }
}

// Helper function to convert UTC back to local time for display
export function convertFromUTC(utcDate: any, timezone: any): { localDate: string, localTime: string } {
  try {
    const dt = DateTime.fromJSDate(utcDate, { zone: 'utc' });
    const localDt = dt.setZone(timezone);
    
    if (!localDt.isValid) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    
    return {
      localDate: localDt.toISODate() || '', // YYYY-MM-DD format
      localTime: localDt.toFormat('HH:mm')  // HH:MM format
    };
  } catch (error) {
    throw new Error(`Error converting UTC to local time: ${error}`);
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    const dt = DateTime.now().setZone(timezone);
    return dt.isValid;
  } catch {
    return false;
  }
}
export function getTimezoneInfo(timezone: string, date?: Date): { offsetName: string, offsetMinutes: number } {
  try {
    const dt = date ? DateTime.fromJSDate(date, { zone: timezone }) : DateTime.now().setZone(timezone);
    return {
      offsetName: dt.offsetNameShort || '',
      offsetMinutes: dt.offset
    };
  } catch (error) {
    throw new Error(`Error getting timezone info: ${error}`);
  }
}