
import mongoose from "mongoose";
import { UserInfoModel } from "src/models/user/user-info";
import { CompatibilityResultModel } from "src/models/user/compatibility-schema";
import { getAstroDataFromGPT } from "src/utils/gpt/generateAstroData";
import { getCompatibilityAnalysisFromGPT } from "src/utils/gpt/getCompatibilityMatch";
import { UserModel } from "src/models/user/user-schema";

export const generateCompatibilityResultService = async (userId: string, partnerDetails: any) => {
  const userInfo = await UserInfoModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  const userData = await UserModel.findById(userId).select("fullName");
  let userAstroData;
  if (userInfo?.dob && userInfo?.timeOfBirth && userInfo?.birthPlace) {
    // Check if astrological data exists in the userInfo (we assume it's stored under custom keys or added)
    if (userInfo["zodiacSign"]) {
      userAstroData = {
        zodiacMoonSign: userInfo["zodiacSign"],
        personalityKeywords: userInfo["personalityKeywords"] || [],
        birthStar: userInfo["birthStar"],
        sunSign: userInfo["sunSign"],
        moonSign:userInfo["moonSign"]
      };
    } else {
      userAstroData = await getAstroDataFromGPT({
        fullName: userData?.fullName,
        dob: userInfo.dob,
        timeOfBirth: userInfo.timeOfBirth,
        birthPlace: userInfo.birthPlace,
        gender: userInfo.gender,
      });

      // Save in UserInfo
      await UserInfoModel.updateOne(
        { userId },
        {
          $set: {
            zodiacSign: userAstroData.zodiacSign,
            personalityKeywords: userAstroData.personalityKeywords,
            birthStar: userAstroData.birthStar,
            sunSign: userAstroData.sunSign,
            moonSign:userAstroData.moonSign
          },
        }
      );
    }
  } else {
    throw new Error("User birth details incomplete.");
  }

  // Get partner astro data from GPT
  const partnerAstroData = await getAstroDataFromGPT({
    fullName: `${partnerDetails.firstName} ${partnerDetails.lastName}`,
    dob: partnerDetails.dob,
    timeOfBirth: partnerDetails.timeOfBirth,
    birthPlace: partnerDetails.birthPlace,
    gender: partnerDetails.gender,
  });

  // Generate compatibility result
  const compatibilityResult = await getCompatibilityAnalysisFromGPT({
    you: userAstroData,
    partner: partnerAstroData,
    partnerInfo: partnerDetails,
  });

  // Save to DB
  const saved = await CompatibilityResultModel.create({
    userId,
    partner: partnerDetails,
    result: compatibilityResult,
  });

  const compatibilityData = await CompatibilityResultModel.findById(saved._id).populate("userId" ,"-password -email -fcmToken").lean();

  return compatibilityData;
};
