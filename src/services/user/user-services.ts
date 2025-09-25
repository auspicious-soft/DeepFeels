import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import stripe from "src/config/stripe";
import { getLocationDataFromPlace } from "src/middleware/getLatLngFromPlace";
import { planModel } from "src/models/admin/plan-schema";
import { JournalEncryptionModel } from "src/models/journal/journal-encryption-schema";
import { DailyReflectionModel } from "src/models/user/daily-reflection";
import { moodModel } from "src/models/user/mood-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";
import { genders } from "src/utils/constant";
import { generateReflectionWithGPT } from "src/utils/gpt/daily-reflection-gtp";
import { getAstroDataFromAPI, getAstroDataFromGPT } from "src/utils/gpt/generateAstroData";
import { convertToUTC, generateToken, getTimezoneInfo, hashPassword, isValidTimezone, verifyPassword } from "src/utils/helper";
import { getLocationDataFromPlaceOpenAi } from "src/utils/location";
import { updateUserWithAstrologyData } from "src/utils/updateUserWthAstroData";

configDotenv();

export const homeServices = {
getUserHome: async (payload: any) => {
  const user = payload.userData;
  const userId = user.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Get or generate daily reflection
  let dailyReflection = await DailyReflectionModel.findOne({
    userId: userId,
    date: today,
  }).lean();

  console.log('Existing daily reflection:', dailyReflection);

  if (!dailyReflection) {
    const userData = await UserModel.findById(userId).lean();
    const userInfo = await UserInfoModel.findOne({ userId }).lean();

    console.log('User data:', {
      fullName: userData?.fullName,
      dob: userInfo?.dob,
      timeOfBirth: userInfo?.timeOfBirth,
      birthPlace: userInfo?.birthPlace,
    });

    const hasRequiredData = userData?.fullName &&
                            userInfo?.dob &&
                            userInfo?.birthPlace;

    console.log('Has all required data:', hasRequiredData);

    if (hasRequiredData) {
      try {

        // --- 2️⃣ Prepare data for Reflection Generation ---
        const generationData: {
          name: string;
          dob: any;
          timeOfBirth?: string;
          location: any;
          zodiacSign?: string;
          sunSign?: string;
          moonSign?: string;
          risingSign?: any;
          personalityKeywords?: string[];
        } = {
          name: userData.fullName,
          dob: userInfo?.dob,
          location: userInfo?.birthPlace,
          zodiacSign: userInfo?.zodiacSign,
          sunSign: userInfo?.sunSign,
          moonSign: userInfo?.moonSign,
          risingSign: userInfo?.risingStar,
          personalityKeywords: userInfo?.personalityKeywords,
        };

        if (userInfo.timeOfBirth) {
          generationData.timeOfBirth = userInfo.timeOfBirth;
        }

        const generated = await generateReflectionWithGPT(generationData);

        console.log('Generated reflection:', generated);

        const saved = await DailyReflectionModel.create({
          userId: userId,
          date: today,
          ...generated,
        });

        (dailyReflection as any) = saved.toObject();
        console.log('Saved daily reflection:', dailyReflection);
      } catch (error) {
        console.error('Error generating or saving reflection:', error);
      }
    } else {
      console.log('Missing required user data for generating reflection');
    }
  }

  // 3. Get today's mood (if available)
  const startOfDay = new Date(today);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const moodDoc = await moodModel.findOne({
    userId: userId,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  const subscription = await SubscriptionModel.findOne({
    userId: userId,
  });

  return {
    plan: subscription || null,
    dailyReflection: dailyReflection || null,
    mood: moodDoc ? { mood: moodDoc.mood, note: moodDoc.note || "" } : null,
    moodNotSet: !moodDoc,
  };
},

};

export const profileServices = {
  profile: async (payload: any) => {
    return {
      milestone: 0,
      percentage: 0,
      tasks: 0,
      appliedJobs: 0,
      selectedJobs: 0,
    };
  },

  getUser: async (payload: any) => {
    const { fullName, phone, email, countryCode, image } = payload.userData;
    const user = await UserModel.findById(payload.userData.id).lean();
    const additionalInfo = await UserInfoModel.findOne({
      userId: payload.userData.id,
    }).lean();

    const { dob } = additionalInfo || {};
         const journalEncryptionData = await JournalEncryptionModel.findOne(
    { userId: payload.userData.id },
    { journalEncryptionPassword: 0 } // exclude password
  ).lean();
  
  let journalEncryption = null;
  if (journalEncryptionData) {
    journalEncryption = journalEncryptionData.journalEncryption; // true/false from DB
  }

  const subscription = await SubscriptionModel.findOne({
      userId: payload.userData.id,
    }).lean().sort({createdAt:-1});

    return {
      _id: payload.userData.id,
     user,
     subscription:subscription || null,
      additionalInfo,
      journalEncryption
    };
  },

updateUser: async (payload: any) => {
  const { id: userId, timeZone, ...restPayload } = payload;

  if (timeZone && !isValidTimezone(timeZone)) {
    throw new Error(`Invalid timezone provided: ${timeZone}`);
  }

  let userUpdateInfo: { [key: string]: any } = {};
  let updatedUserData: { [key: string]: any } = {};

  if (restPayload.dob) {
    if (timeZone && restPayload.timeOfBirth) {
      try {
        userUpdateInfo.dobUTC = convertToUTC(restPayload.dob, restPayload.timeOfBirth, timeZone);
        userUpdateInfo.dob = new Date(restPayload.dob);
        userUpdateInfo.timeOfBirth = restPayload.timeOfBirth;
        userUpdateInfo.timeZone = timeZone;

        const timezoneInfo = getTimezoneInfo(timeZone, userUpdateInfo.dobUTC);
        userUpdateInfo.birthTimezoneOffset = timezoneInfo.offsetMinutes;
        userUpdateInfo.birthTimezoneOffsetName = timezoneInfo.offsetName;
      } catch (error) {
        throw new Error(`Failed to convert birth date to UTC: ${error}`);
      }
    } else {
      userUpdateInfo.dob = new Date(restPayload.dob);
      if (restPayload.timeOfBirth) {
        userUpdateInfo.timeOfBirth = restPayload.timeOfBirth;
      }
    }
  } else if (restPayload.timeOfBirth) {
    userUpdateInfo.timeOfBirth = restPayload.timeOfBirth;
  }

  if (restPayload.birthPlace) {
    userUpdateInfo.birthPlace = restPayload.birthPlace;
  }

  if (restPayload.gender) {
    userUpdateInfo.gender = restPayload.gender;
  }

  if (restPayload.fullName) updatedUserData.fullName = restPayload.fullName;
  if (restPayload.countryCode) updatedUserData.countryCode = restPayload.countryCode;
  if (restPayload.phone) updatedUserData.phone = restPayload.phone;
  if (restPayload.image) updatedUserData.image = restPayload.image;

  let additionalInfo = null;
  if (Object.keys(userUpdateInfo).length > 0) {
    additionalInfo = await UserInfoModel.findOneAndUpdate(
      { userId: userId },
      { $set: userUpdateInfo },
      { new: true, upsert: true }
    ).lean();
  } else {
    additionalInfo = await UserInfoModel.findOne({ userId: userId }).lean();
  }

  let user = null;
  if (Object.keys(updatedUserData).length > 0) {
    user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updatedUserData },
      { new: true }
    ).lean();
  } else {
    user = await UserModel.findById(userId).lean();
  }

  if (!user) throw new Error("User not found");

  const journalEncryptionData = await JournalEncryptionModel.findOne(
    { userId: userId },
    { journalEncryptionPassword: 0 }
  ).lean();

  let journalEncryption = journalEncryptionData?.journalEncryption || null;

  let userAstroData: any = null;

  const shouldUpdateAstroData =
    restPayload.dob ||
    restPayload.birthPlace ||
    restPayload.timeOfBirth;

  if (additionalInfo && additionalInfo.birthPlace && (additionalInfo.dob || additionalInfo.dobUTC) && shouldUpdateAstroData) {
    try {
      const [year, month, day] = additionalInfo.dob? additionalInfo.dob.split("-").map(Number) : [0, 0, 0];

      const [hour, min] = additionalInfo.timeOfBirth
        ? additionalInfo.timeOfBirth.split(":").map(Number)
        : [0, 0];

      const locationData = await getLocationDataFromPlaceOpenAi(
        additionalInfo.birthPlace,
        additionalInfo.dob,
        additionalInfo.timeOfBirth
      );

      const { lat, lon, timezoneOffset } = locationData;

      const astroData = await getAstroDataFromAPI({
        day,
        month,
        year,
        hour,
        min,
        lat,
        lon,
        timezone: timezoneOffset,
      });

      console.log("astroData:", astroData);

      if (astroData) {
        await updateUserWithAstrologyData(astroData, userId,timezoneOffset);
      } else {
        throw new Error("Failed to fetch astrology data");
      }
    } catch (error) {
      console.error("Error updating astrology data:", error);
    }
  }

  const userMoreInfo = await UserInfoModel.findOne({ userId: userId }).lean();

  const subscription = await SubscriptionModel.findOne({ userId: userId }).sort({ createdAt: -1 });

  return {
    _id: userId,
    user,
    subscription: subscription || null,
    additionalInfo: userMoreInfo,
    journalEncryption,
  };
},

  changePassword: async (payload: any) => {
    const { id, oldPassword, newPassword } = payload;

    const user = await UserModel.findById(id);
    if (!user) {
      throw new Error("userNotFound");
    }

    const passwordStatus = await verifyPassword(
      oldPassword,
      user?.password || ""
    );

    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }

    const updatedPassword = await hashPassword(newPassword);
    user.password = updatedPassword;
    await user.save();

    return {};
  },
  changeCountry: async (payload: any) => {
    const { id, country } = payload;
    await UserModel.findByIdAndUpdate(id, { $set: { country } });
    return {};
  },

  updatePlan: async (payload: any) => {
     const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const toDate = (timestamp?: number | null): Date | null =>
      typeof timestamp === "number" && !isNaN(timestamp)
        ? new Date(timestamp * 1000)
        : null;

    const { type, planId, userData } = payload;
    const { stripeCustomerId, currency, paymentMethodId, status } =
      userData.subscription;

    /** Cancel Trial (only if trialing) */
    if (type === "cancelTrial" && status !== "trialing") {
      throw new Error("Your subscription is not trialing");
    }

    /** Cancel full subscription */
    if (type === "cancelSubscription") {
      await stripe.subscriptions.update(
        userData.subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      await SubscriptionModel.findOneAndUpdate(
        {
          userId: userData.id,
          $or: [{ status: "active" }, { status: "trialing" }],
        },
        { $set: { status: "canceling" } },
        { session }
      );
    }

    /** Cancel Trial Immediately (no new plan) */
    if (type === "cancelTrial" && !planId) {
      await stripe.subscriptions.cancel(
  userData.subscription.stripeSubscriptionId,
  {
    invoice_now: false,
    prorate: false,
  }
);
    }

    /** Cancel Trial + Start New Plan */
    if (type === "cancelTrial" && planId) {
      // cancel existing subscription
      await stripe.subscriptions.cancel(
        userData.subscription.stripeSubscriptionId
      );

      await SubscriptionModel.findByIdAndDelete(userData.subscription._id, {
        session,
      });

      const planData = await planModel.findById(planId).session(session);
      if (!planData) throw new Error("Plan not found");

      const newSub = await stripe.subscriptions.create({
        customer: typeof stripeCustomerId === "string"
          ? stripeCustomerId
          : stripeCustomerId?.id ?? "",
        items: [{ price: planData.stripePrices }],
        default_payment_method: paymentMethodId,
        expand: ["latest_invoice.payment_intent"],
      });

      const newSubPrice = newSub.items.data[0]?.price;
      if (!newSubPrice) throw new Error("New subscription price not found");

      // ✅ Schema-aligned subscription creation
      await SubscriptionModel.create(
        [
          {
            userId: userData.id,
            stripeCustomerId,
            stripeSubscriptionId: newSub.id,
            planId,
            paymentMethodId,
            status: newSub.status,
            trialStart: toDate(newSub.trial_start),
            trialEnd: toDate(newSub.trial_end),
            startDate: toDate(newSub.start_date) ?? new Date(),
            currentPeriodStart: toDate(newSub.current_period_start),
            currentPeriodEnd: toDate(newSub.current_period_end),
            nextBillingDate: toDate(newSub.current_period_end),
            amount: newSubPrice.unit_amount
              ? newSubPrice.unit_amount / 100
              : 0,
            currency: newSubPrice.currency ?? currency,
            nextPlanId: null,
          },
        ],
        { session }
      );
    }

    /** Upgrade (schedule new plan after current ends) */
    if (type === "upgrade") {
      await stripe.subscriptions.update(
        userData.subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );

      await SubscriptionModel.findOneAndUpdate(
        { userId: userData.id },
        { $set: { nextPlanId: planId } },
        { session }
      );
    }

    await session.commitTransaction();
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
};
