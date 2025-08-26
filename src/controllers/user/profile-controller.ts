import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { JournalEncryptionModel } from "src/models/journal/journal-encryption-schema";
import { DailyReflectionModel } from "src/models/user/daily-reflection";
import { TokenModel } from "src/models/user/token-schema";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";
import { chatServices } from "src/services/chat-gpt/chat-service";
import { generateCompatibilityResultService, getAllUserCompatibilityService, getCompatibilityByIdService } from "src/services/compatibility/compatibility-services";
import { journalServices } from "src/services/journal/journal-services";
import { moodServices } from "src/services/mood/mood-service";
import { supportService } from "src/services/support/support-services";
import { profileServices } from "src/services/user/user-services";
import { generateReflectionWithGPT } from "src/utils/gpt/daily-reflection-gtp";
import bcrypt from "bcryptjs";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";
import { SubscriptionModel } from "src/models/user/subscription-schema";

export const userProfile = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await profileServices.profile({
      userData,
    });
    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;

    console.log(userData);

    const response = await profileServices.getUser({
      userData,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;

    const {
      fullName,
      email,
      countryCode,
      phone,
      dob,
      timeOfBirth,
      birthPlace,
      image,
    } = req.body;

    const response = await profileServices.updateUser({
      dob,
      fullName,
      countryCode,
      phone,
      timeOfBirth,
      birthPlace,
      image,
      id: userData.id,
    });

    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new Error("invalidFields");
    }

    const response = await profileServices.changePassword({
      id: userData.id,
      oldPassword,
      newPassword,
    });

    return OK(res, response || {}, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};

//   try {
//     const userData = req.user as any;
//     const { country } = req.body;

//     if (!countries.includes(country)) {
//       throw new Error("invalidFields");
//     }

//     const response = await profileServices.changeCountry({
//       id: userData.id,
//       country,
//     });

//     return OK(res, response || {}, req.body.language);
//   } catch (err: any) {
//     if (err.message) {
//       return BADREQUEST(res, err.message, req.body.language);
//     }
//     return INTERNAL_SERVER_ERROR(res, req.body.language);
//   }
// };
export const getPlatformInfo = async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;

    if (!["privacyPolicy", "support", "termAndCondition"].includes(key)) {
      throw new Error("invalidFields");
    }

    const response = await PlatformInfoModel.findOne({
      isActive: true,
    });

    let result = {};
    if (response) {
      if (key === "privacyPolicy")
        result = { privacyPolicy: response.privacyPolicy };
      else if (key === "support") result = { support: response.support };
      else if (key === "termAndCondition")
        result = { termAndCondition: response.termAndCondition };
    }

    return OK(res, result, req.body.language);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
// export const getNotificationSetting = async (req: Request, res: Response) => {
//   try {
//     const userData = req.user as any;

//     const response = await UserInfoModel.findOne({
//       userId: userData.id,
//     }).lean();

//     // return OK(res, response?.notificationSettings || {}, req.body.language);
//     return OK(res, {}, req.body.language);
//   } catch (err: any) {
//     if (err.message) {
//       return BADREQUEST(res, err.message, req.body.language);
//     }
//     return INTERNAL_SERVER_ERROR(res, req.body.language);
//   }
// };
// export const postNotificationSetting = async (req: Request, res: Response) => {
//   try {
//     const userData = req.user as any;
//     const {
//       jobAlerts,
//       tasksPortfolioProgress,
//       profilePerformance,
//       engagementMotivation,
//     } = req.body;
//     if (
//       typeof jobAlerts !== "boolean" ||
//       typeof tasksPortfolioProgress !== "boolean" ||
//       typeof profilePerformance !== "boolean" ||
//       typeof engagementMotivation !== "boolean"
//     ) {
//       throw new Error("invalidFields");
//     }
//     const response = await UserInfoModel.findOneAndUpdate(
//       { userId: userData.id },
//       {
//         $set: {
//           notificationSettings: {
//             jobAlerts,
//             tasksPortfolioProgress,
//             profilePerformance,
//             engagementMotivation,
//           },
//         },
//       },
//       {
//         new: true,
//       }
//     );

//     return OK(res, response?.notificationSettings || {}, req.body.language);
//   } catch (err: any) {
//     if (err.message) {
//       return BADREQUEST(res, err.message, req.body.language);
//     }
//     return INTERNAL_SERVER_ERROR(res, req.body.language);
//   }
// };
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const {password} = req.body

    if (password) {
      // If password is provided, verify it
      const user = await UserModel.findById(userData.id);
      if (!user) {
        return BADREQUEST(res, "User not found", "en");
      }
     if (!user.password) {
    // This account was created via OAuth, so password-based delete is not valid
      return BADREQUEST(res, "This account does not have a password", "en");
     }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return BADREQUEST(res, "Invalid password", "en");
      }
    }

    await UserModel.findByIdAndUpdate(userData.id, {
      isDeleted: true,
    });

    await TokenModel.findOneAndDelete({
      userId: userData.id,
    });

    const subscription = await SubscriptionModel.findOne({
      userId: userData.id,
    }).lean();
    let type = null;

    type =
      subscription?.status == "trialing"
        ? "cancelTrial"
        : subscription?.status == "active"
        ? "cancelSubscription"
        : null;

    if (type) {
      await profileServices.updatePlan({
        type,
        userData,
      });
    }

    return OK(res, {}, "en", "accountDeleted");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, "en");
    }
    return INTERNAL_SERVER_ERROR(res, "en");
  }
};
export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { type, planId } = req.body;

    if (!["upgrade", "cancelTrial", "cancelSubscription"].includes(type)) {
      throw new Error("invalidFields");
    }

    if (type === "upgrade" && !planId) {
      throw new Error("PlanId is required");
    }

    const response = await profileServices.updatePlan({
      type,
      planId,
      userData,
    });

    return OK(res, {}, req.body.language, response);
  } catch (err: any) {
    console.log('err:', err);
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getDailyReflection = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    const userData = await UserModel.findById(user.id).lean();
    if (!userData) {
      throw new Error("User not found");
    }
    if (!userData.isUserInfoComplete) {
      throw new Error("User info is not complete");
    }
    const userInfo = await UserInfoModel.findOne({ userId: user.id }).lean();
    if (!userInfo?.dob || !userInfo?.timeOfBirth || !userInfo?.birthPlace) {
      return res.status(400).json({ message: "Incomplete user birth details" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await DailyReflectionModel.findOne({
      userId: user.id,
      date: today,
    }).lean();

    if (existing){
      return res.status(200).json({ success: true, data: existing });
    }else{
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

    return res.status(200).json({ success: true, data: saved });
  }
  } catch (err: any) {
    console.error("Error generating reflection:", err);
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getAllDailyReflections = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const reflections = await DailyReflectionModel.find({ userId: user.id })
      .sort({ date: -1 }) // newest first
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    const total = await DailyReflectionModel.countDocuments({ userId: user.id });

    return res.status(200).json({
      success: true,
      data: reflections,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (err: any) {
    console.error("Error fetching reflections:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getDailyReflectionById = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    const reflection = await DailyReflectionModel.findOne({
      _id: id,
      userId: user.id,
    }).lean();

    if (!reflection) {
      return res.status(404).json({ success: false, message: "Reflection not found" });
    }

    return res.status(200).json({ success: true, data: reflection });
  } catch (err: any) {
    console.error("Error fetching reflection by id:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createJournal = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { title, content } = req.body;

    if (!title || !content) {
      throw new Error("title and content are required");
    }
    const date = new Date();
    const journal = await journalServices.createOrUpdateJournal({
      userId: user.id,
      date: new Date(date),
      title,
      content,
    });

    return res.status(201).json({ success: true, data: journal });
  } catch (err: any) {
    console.error(err);
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getJournalByUserId = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const journals = await journalServices.getJournalsByUser(user.id);
    return res.status(200).json({ success: true, data: journals });
  } catch (error: any) {
    console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getJournalById = async(req:Request,res:Response)=>{
  try {
    const user = req.user as any;
    const id = req.params.id;
    const journals = await journalServices.getJournalById(id, user.id);
    return res.status(200).json({ success: true, data: journals });
  } catch (error : any) {
     console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
}

export const updateJournal = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const id = req.params.id;
    const { title, content } = req.body;
    if ([title, content].some((field) => !field || field.trim() === "")) {
      throw new Error("title and content are required");
    }
    const payload = {
      title,
      content,
    };
    const journal = await journalServices.updateJournalById(
      id,
      user.id,
      payload
    );
    if (!journal) {
      throw new Error(
        "Journal not found or you do not have permission to update it"
      );
    }
    return res.status(200).json({ success: true, data: journal });
  } catch (error: any) {
    console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const toggleJournalEncryption = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { password } = req.body; // send password from frontend

    let JournalEncryption = await JournalEncryptionModel.findOne({ userId: user.id });
    if (!password) throw new Error("Password is required to enable encryption");
    // If encryption is OFF and turning it ON
    if (!JournalEncryption) {
      JournalEncryption = new JournalEncryptionModel({
        userId: user.id,
        journalEncryptionPassword: password,
        journalEncryption: true,
      });
      await JournalEncryption.save();
      return res.status(200).json({ success: true, message: "Encryption enabled successfully" });
    }

    // If encryption is ON and turning it OFF
    // If encryption record exists
    if (JournalEncryption.journalEncryption) {
      // Currently ON, user wants to turn it OFF
      const isMatch = await bcrypt.compare(password, JournalEncryption.journalEncryptionPassword || "");
      if (!isMatch) {
        throw new Error("Incorrect password");
      }

      JournalEncryption.journalEncryption = false;
      await JournalEncryption.save();
      
      return res.status(200).json({ 
        success: true, 
        message: "Encryption disabled successfully",
        journalEncryption: false
      });
    } else {
      // Currently OFF, user wants to turn it ON
      const isMatch = await bcrypt.compare(password, JournalEncryption.journalEncryptionPassword || "");
      if (!isMatch) {
        throw new Error("Incorrect password");
      }

      JournalEncryption.journalEncryption = true;
      await JournalEncryption.save();
      
      return res.status(200).json({ 
        success: true, 
        message: "Encryption enabled successfully",
        journalEncryption: true
      });
    }

  } catch (error: any) {
    console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const createOrUpdateMood = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { mood,description } = req.body;

    if (!mood) throw new Error("Mood is required");

    const result = await moodServices.createOrUpdateMood({
      userId: user.id,
      mood,
      description
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const getMoodByUserId = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { month, year } = req.query;

    if (!month || !year) {
      throw new Error("Month and year are required");
    }

    const moods = await moodServices.getMoodsByMonth(
      user.id,
      parseInt(month as string),
      parseInt(year as string)
    );

    return res.status(200).json({ success: true, data: moods });
  } catch (error: any) {
    console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, req.body.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language);
  }
};
export const streamChatWithGPT = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { content } = req.body;

  if (!content) {
    throw new Error("Content is required");
  }

  try {
    // Set stream headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await chatServices.streamMessageToGPT(user.id, content, res);
  } catch (error) {
    console.error("Streaming error:", error);
    if (!res.headersSent) {
      throw new Error("Stream error occurred");
    }
    res.write(
      `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
    );
    res.end();
  }
};
export const getChatHistory = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { limit = 50,page = 1 } = req.query;

  if (!limit) {
    throw new Error("Content is required");
  }

  try {
    const response = await chatServices.getUserChatHistory(user.id, (limit as any), (page as any));
    return res.status(200).json({ success: true, data: response });
  } catch (error) {
    console.error("Streaming error:", error);
    if (!res.headersSent) {
      throw new Error("Stream error occurred");
    }
    res.write(
      `data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`
    );
    res.end();
  }
};

export const generateCompatibilityController = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload;
    const partner = req.body;

    if (!partner) {
      throw new Error("Partner details are required")
    }

    const result = await generateCompatibilityResultService(user.id, partner);

    return res.status(200).json({
      success: true,
      message: "Compatibility result generated successfully",
      data: result,
    });
  } catch (error: any) {
   console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, "en");
    }
    return INTERNAL_SERVER_ERROR(res, "en");
  }
};

export const getAllUserCompatibility = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id 
    const results = await getAllUserCompatibilityService(userId);
    res.status(200).json({ success: true, data: results });
  } catch (error : any) {
   console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, "en");
    }
    return INTERNAL_SERVER_ERROR(res, "en");
  }
};

export const getCompatibilityById = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const result = await getCompatibilityByIdService(id, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error : any) {
     console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, "en");
    }
    return INTERNAL_SERVER_ERROR(res, "en");
  }
};
export const createSupportRequest = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { fullName, email, subject, message } = req.body;

    if (!fullName || !email || !subject || !message) {
      throw new Error("All fields are required");
    }

    const result = await supportService.createSupportRequest({
      userId: user.id,
      fullName,
      email,
      subject,
      message,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, "en");
    }
    return INTERNAL_SERVER_ERROR(res, "en");
  }
};
export const getSupportRequests = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const result = await supportService.getAllSupportRequests();

    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
     console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, "en");
    }
    return INTERNAL_SERVER_ERROR(res, "en");
  }
};
export const getSubscription = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    // Fetch subscription
    const subscription = await SubscriptionModel.findOne({ userId: user.id }).lean();
    if (!subscription) {
      throw new Error("No Subscription");
    }

    // Fetch user flags
    const userDoc = await UserModel.findById(user.id).select("hasUsedTrial").lean();

    const now = new Date();
    const isTrial =
      subscription.status === "trialing" ||
      (subscription.trialEnd && subscription.trialEnd > now);

    const trialEndsOn = isTrial ? subscription.trialEnd : null;

    const expiresOn = subscription.currentPeriodEnd || subscription.nextBillingDate || null;

    // e.g., expiring in next 7 days
    const isExpiringSoon =
      expiresOn !== null &&
      expiresOn.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000;

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        flags: {
          isTrial,
          trialEndsOn,
          hasUsedTrial: userDoc?.hasUsedTrial ?? false,
          isExpiringSoon,
          expiresOn,
        },
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
