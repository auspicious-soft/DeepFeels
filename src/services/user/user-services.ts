import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { JournalEncryptionModel } from "src/models/journal/journal-encryption-schema";
import { DailyReflectionModel } from "src/models/user/daily-reflection";
import { moodModel } from "src/models/user/mood-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";
import { genders } from "src/utils/constant";
import { generateReflectionWithGPT } from "src/utils/gpt/daily-reflection-gtp";
import { generateToken, hashPassword, verifyPassword } from "src/utils/helper";

configDotenv();

export const homeServices = {
 getUserHome: async (payload: any) => {
  const user = payload.userData;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Get or generate daily reflection
  let dailyReflection = await DailyReflectionModel.findOne({
    userId: user.id,
    date: today,
  }).lean();

  console.log('Existing daily reflection:', dailyReflection);

  if (!dailyReflection) {
    const userData = await UserModel.findById(user.id).lean();
    const userInfo = await UserInfoModel.findOne({ userId: user.id }).lean();

    // Debug logging to see what data we have
    console.log('User data:', {
      fullName: userData?.fullName,
      dob: userInfo?.dob,
      timeOfBirth: userInfo?.timeOfBirth,
      birthPlace: userInfo?.birthPlace,
    });

    // Check if all required fields exist
    const hasRequiredData = userData?.fullName && 
                           userInfo?.dob && 
                           userInfo?.timeOfBirth && 
                           userInfo?.birthPlace;

    console.log('Has all required data:', hasRequiredData);

    if (hasRequiredData) {
      try {
        const generated = await generateReflectionWithGPT({
          name: userData.fullName,
          dob: userInfo.dob.toISOString().split("T")[0],
          timeOfBirth: userInfo.timeOfBirth || undefined,
          location : userInfo.birthPlace,
        });
        
        console.log('Generated reflection:', generated);

        const saved = await DailyReflectionModel.create({
          userId: user.id,
          date: today,
          ...generated,
        });

        (dailyReflection as any) = saved.toObject();
        console.log('Saved daily reflection:', dailyReflection);
      } catch (error) {
        console.error('Error generating or saving reflection:', error);
        // You might want to handle this error differently
        // For now, we'll continue with null dailyReflection
      }
    } else {
      console.log('Missing required user data for generating reflection');
    }
  }

  // 2. Get today's mood (if available)
  const startOfDay = new Date(today);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const moodDoc = await moodModel.findOne({
    userId: user.id,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).lean();

  const subscription = await SubscriptionModel.findOne({
    userId: user.id,
  });

  return {
    plan: subscription?.status || null,
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

    return {
      _id: payload.userData.id,
     user,
      additionalInfo,
      journalEncryption
    };
  },

updateUser: async (payload: any) => {
  // Define dynamic update objects
  let userUpdateInfo: { [key: string]: any } = {};
  let updatedUserData: { [key: string]: any } = {};

  // Conditionally populate UserInfo update fields
  if (payload.dob) {
    userUpdateInfo.dob = payload.dob;
  }
  if (payload.timeOfBirth) {
    userUpdateInfo.timeOfBirth = payload.timeOfBirth;
  }
  if (payload.birthPlace) {
    userUpdateInfo.birthPlace = payload.birthPlace;
  }

  // Conditionally populate User update fields
  if (payload.fullName) {
    updatedUserData.fullName = payload.fullName;
  }
  if (payload.countryCode) {
    updatedUserData.countryCode = payload.countryCode;
  }
  if (payload.phone) {
    updatedUserData.phone = payload.phone;
  }
  if (payload.image) {
    updatedUserData.image = payload.image;
  }

  // Update UserInfo model
  const additionalInfo = await UserInfoModel.findOneAndUpdate(
    { userId: payload.id },
    { $set: userUpdateInfo },
    { new: true }
  ).lean();

  // Update User model
  const user = await UserModel.findByIdAndUpdate(
    payload.id,
    { $set: updatedUserData },
    { new: true }
  ).lean();
  
           const journalEncryptionData = await JournalEncryptionModel.findOne(
    { userId: payload.id },
    { journalEncryptionPassword: 0 } // exclude password
  ).lean();
  
  let journalEncryption = null;
  if (journalEncryptionData) {
    journalEncryption = journalEncryptionData.journalEncryption; // true/false from DB
  }
  return {
    _id: payload.id,
    user,
    additionalInfo,
    journalEncryption
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
