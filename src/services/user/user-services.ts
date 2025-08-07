import { configDotenv } from "dotenv";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
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

    if (!dailyReflection) {
      const userData = await UserModel.findById(user.id).lean();
      const userInfo = await UserInfoModel.findOne({ userId: user.id }).lean();

      if (
        userData?.fullName &&
        userInfo?.dob &&
        userInfo?.timeOfBirth &&
        userInfo?.birthPlace
      ) {
        const generated = await generateReflectionWithGPT({
          name: userData.fullName,
          dob: userInfo.dob.toISOString().split("T")[0],
          timeOfBirth: userInfo.timeOfBirth,
          location: userInfo.birthPlace,
        });

        const saved = await DailyReflectionModel.create({
          userId: user.id,
          date: today,
          ...generated,
        });

        dailyReflection = saved.toObject();
      }
    }

    // 2. Get today’s mood (if available)
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const moodDoc = await moodModel.findOne({
      userId: user.id,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    return {
      plan: user.subscription?.planName || null,
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

    return {
      _id: payload.userData.id,
     user,
      additionalInfo
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
  const userInfo = await UserInfoModel.findOneAndUpdate(
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

  return {
    _id: payload.id,
    image: user?.image || "",
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
    countryCode: user?.countryCode || "",
    dob: userInfo?.dob || "",
    timeOfBirth: userInfo?.timeOfBirth || "",
    birthPlace: userInfo?.birthPlace || "",
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
  changeLanguage: async (payload: any) => {
    const { id, language } = payload;
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: { language } },
      { new: true }
    );
    let updatedToken;
    if (user) {
      updatedToken = await generateToken(user);
    }

    return { token: updatedToken || null };
  },
  changeCountry: async (payload: any) => {
    const { id, country } = payload;
    await UserModel.findByIdAndUpdate(id, { $set: { country } });
    return {};
  },

  updatePlan: async (payload: any) => {
    const { type, planId, userData } = payload;
    if (type == "cancelSubscription") {
      await stripe.subscriptions.update(
        userData.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      await SubscriptionModel.findOneAndUpdate(
        {
          userId: userData.id,
          status: { $or: ["active", "trialing"] },
        },
        {
          $set: {
            status: "canceling",
          },
        }
      );
    }

    if (type == "cancelTrial") {
      await stripe.subscriptions.update(
        userData.subscription.stripeSubscriptionId,
        {
          trial_end: "now",
          proration_behavior: "none",
        }
      );
    }

    if (type == "upgrade") {
      await stripe.subscriptions.update(
        userData.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      await SubscriptionModel.findOneAndUpdate(
        {
          userId: userData.id,
        },
        {
          $set: {
            nextPlanId: planId,
          },
        }
      );
    }

    return {};
  },
};
