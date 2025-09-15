
import mongoose from "mongoose";
import { UserInfoModel } from "src/models/user/user-info";
import { CompatibilityResultModel } from "src/models/user/compatibility-schema";
import { getAstroDataFromGPT } from "src/utils/gpt/generateAstroData";
import { getCompatibilityAnalysisFromGPT } from "src/utils/gpt/getCompatibilityMatch";
import { UserModel } from "src/models/user/user-schema";
import { updateUserWithAstrologyData } from "src/utils/updateUserWthAstroData";
import { generateAstroDataFromAPI } from "src/utils/generatedata";

export const generateCompatibilityResultService = async (userId: string, partnerDetails: any) => {
  const userInfo = await UserInfoModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  const userData = await UserModel.findById(userId).select("fullName");
  const relationshipType = partnerDetails.relationshipType;
  
  let userAstroData;
  
  // Generate or retrieve user's astrological data
  if (userInfo?.dob && userInfo?.birthPlace) {
    // Check if astrological data already exists in userInfo
    if (userInfo.zodiacSign && userInfo.sunSign && userInfo.moonSign) {
      userAstroData = {
        zodiacSign: userInfo.zodiacSign,
        personalityKeywords: userInfo.personalityKeywords || [],
        sunSign: userInfo.sunSign,
        moonSign: userInfo.moonSign,
        risingStar: userInfo.risingStar,
        ascendantDegree: userInfo.ascendantDegree,
        planetsData: userInfo.planetsData,
        housesData: userInfo.housesData,
        aspectsData: userInfo.aspectsData
      };
    } else {
      // Generate astro data using the same approach as userMoreInfo
      userAstroData = await generateAstroDataFromAPI({
        dob: userInfo.dob,
        timeOfBirth: userInfo.timeOfBirth,
        birthPlace: userInfo.birthPlace
      });

      // Save the generated astro data to UserInfo
      if (userAstroData) {
        await updateUserWithAstrologyData(userAstroData, userId);
      } else {
        throw new Error("Failed to generate user's astrological data");
      }
    }
  } else {
    throw new Error("User birth details incomplete.");
  }

  // Generate partner's astro data using the same API approach
  let partnerAstroData;
  try {
    partnerAstroData = await generateAstroDataFromAPI({
      dob: partnerDetails.dob,
      timeOfBirth: partnerDetails.timeOfBirth,
      birthPlace: partnerDetails.birthPlace
    });

    if (!partnerAstroData) {
      throw new Error("Failed to generate partner's astrological data");
    }
  } catch (error) {
    console.error('Error generating partner astro data:', error);
    throw new Error("Failed to generate partner's astrological data");
  }

  // Prepare data for compatibility analysis
  const userDataForGPT = {
    zodiacSign: userAstroData.moonSign, // Moon sign as zodiac sign
    personalityKeywords: userAstroData.personalityKeywords || [],
    risingStar: userAstroData.risingStar, // Rising star instead of birth star
    sunSign: userAstroData.sunSign
  };

  const partnerDataForGPT = {
    zodiacSign: partnerAstroData.moonSign, // Moon sign as zodiac sign
    personalityKeywords: partnerAstroData.personalityKeywords || [],
    risingStar: partnerAstroData.risingStar, // Rising star instead of birth star
    sunSign: partnerAstroData.sunSign
  };

  // Generate compatibility result
  const compatibilityResult = await getCompatibilityAnalysisFromGPT({
    you: userDataForGPT,
    partner: partnerDataForGPT,
    partnerInfo: partnerDetails || null,
    relationshipType
  });

  // Save to DB
  const saved = await CompatibilityResultModel.create({
    userId,
    partner: partnerDetails,
    result: compatibilityResult,
    relationshipType
  });

  const compatibilityData = await CompatibilityResultModel.findById(saved._id)
    .populate("userId", "-password -email -fcmToken")
    .lean();

  return compatibilityData;
};

export const getAllUserCompatibilityService = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }

  return await CompatibilityResultModel.find({ userId }).populate("userId", "-password -fcmToken -stripeCustomerId").sort({ createdAt: -1 });
};

export const getCompatibilityByIdService = async (id: string, userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid compatibility result ID");
  }

  const result = await CompatibilityResultModel.findOne({ _id: id, userId }).populate("userId","-password -fcmToken -stripeCustomerId")
  if (!result) {
    throw new Error("Compatibility result not found");
  }

  return result;
};