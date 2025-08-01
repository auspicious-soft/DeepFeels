import { configDotenv } from "dotenv";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";
import { genders } from "src/utils/constant";
import { generateToken, hashPassword, verifyPassword } from "src/utils/helper";

configDotenv();

export const homeServices = {
  getUserHome: async (payload: any) => {
    return {
      plan: payload.userData.subscription.planName || null,
      milestone: 0,
      percentage: 0,
      tasks: [],
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
