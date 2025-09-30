
import mongoose from "mongoose";
import { UserInfoModel } from "src/models/user/user-info";
import { CompatibilityResultModel } from "src/models/user/compatibility-schema";
import { getAstroDataFromGPT } from "src/utils/gpt/generateAstroData";
import { getCompatibilityAnalysisFromGPT } from "src/utils/gpt/getCompatibilityMatch";
import { UserModel } from "src/models/user/user-schema";
import { updateUserWithAstrologyData } from "src/utils/updateUserWthAstroData";
import { generateAstroDataFromAPI } from "src/utils/generatedata";

export const generateCompatibilityResultService = async (
  userId: string,
  partnerDetails: any,
  docId?: string // new param (from query)
) => {
  const userInfo = await UserInfoModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
  });
  const userData = await UserModel.findById(userId).select("fullName");
  const relationshipType = partnerDetails.relationshipType;

  let userAstroData;

  // Generate or retrieve user's astrological data
  if (userInfo?.dob && userInfo?.birthPlace) {
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
        aspectsData: userInfo.aspectsData,
      };
    } else {
      userAstroData = await generateAstroDataFromAPI({
        dob: userInfo.dob,
        timeOfBirth: userInfo.timeOfBirth,
        birthPlace: userInfo.birthPlace,
      });

      if (userAstroData) {
        await updateUserWithAstrologyData(
          userAstroData,
          userId,
          userAstroData.timezoneOffset,
          userAstroData.dataToSave
        );
      } else {
        throw new Error("Failed to generate user's astrological data");
      }
    }
  } else {
    throw new Error("User birth details incomplete.");
  }

  let partnerAstroData;

  if (docId) {
    // If doc exists, reuse partnerAstroData
    const existingDoc = await CompatibilityResultModel.findById(docId);
    if (!existingDoc) throw new Error("Compatibility document not found");

    // ✅ Check if relation already exists
    const existingRelation = existingDoc.relations.find(
  (r) => r.relationshipType.toLowerCase() === relationshipType.toLowerCase()
);
    if (existingRelation) {
      // Just return without regenerating
      return CompatibilityResultModel.findById(existingDoc._id)
        .populate("userId", "-password -email -fcmToken")
        .lean();
    }

    // Reuse partner astro data from first relation
    if (existingDoc.relations?.[0]?.partnerAstroData) {
      partnerAstroData = existingDoc.relations[0].partnerAstroData;
    } else {
      // Fallback if missing
      partnerAstroData = await generateAstroDataFromAPI({
        dob: partnerDetails.dob,
        timeOfBirth: partnerDetails.timeOfBirth,
        birthPlace: partnerDetails.birthPlace,
      });
    }

    // Prepare GPT data
    const userDataForGPT = {
      zodiacSign: userAstroData.moonSign,
      personalityKeywords: userAstroData.personalityKeywords || [],
      risingStar: userAstroData.risingStar,
      sunSign: userAstroData.sunSign,
    };

    const partnerDataForGPT = {
      zodiacSign: partnerAstroData.moonSign,
      personalityKeywords: partnerAstroData.personalityKeywords || [],
      risingStar: partnerAstroData.risingStar,
      sunSign: partnerAstroData.sunSign,
    };

    const compatibilityResult = await getCompatibilityAnalysisFromGPT({
      you: userDataForGPT,
      partner: partnerDataForGPT,
      partnerInfo: partnerDetails || null,
      relationshipType,
    });

    // Add new relation
    existingDoc.relations.push({
      relationshipType:relationshipType.toLowerCase(),
      partnerAstroData,
      result: compatibilityResult,
    });

    const savedDoc = await existingDoc.save();

    return CompatibilityResultModel.findById(savedDoc._id)
      .populate("userId", "-password -email -fcmToken")
      .lean();
  } else {
    // First time → must generate partnerAstroData
    partnerAstroData = await generateAstroDataFromAPI({
      dob: partnerDetails.dob,
      timeOfBirth: partnerDetails.timeOfBirth,
      birthPlace: partnerDetails.birthPlace,
    });

    if (!partnerAstroData) {
      throw new Error("Failed to generate partner's astrological data");
    }

    // Prepare data for GPT
    const userDataForGPT = {
      zodiacSign: userAstroData.moonSign,
      personalityKeywords: userAstroData.personalityKeywords || [],
      risingStar: userAstroData.risingStar,
      sunSign: userAstroData.sunSign,
    };

    const partnerDataForGPT = {
      zodiacSign: partnerAstroData.moonSign,
      personalityKeywords: partnerAstroData.personalityKeywords || [],
      risingStar: partnerAstroData.risingStar,
      sunSign: partnerAstroData.sunSign,
    };

    const compatibilityResult = await getCompatibilityAnalysisFromGPT({
      you: userDataForGPT,
      partner: partnerDataForGPT,
      partnerInfo: partnerDetails || null,
      relationshipType,
    });

    const savedDoc = await CompatibilityResultModel.create({
      userId,
      partner: partnerDetails,
      relations: [
        {
          relationshipType: relationshipType.toLowerCase(),
          partnerAstroData,
          result: compatibilityResult,
        },
      ],
    });

    return CompatibilityResultModel.findById(savedDoc._id)
      .populate("userId", "-password -email -fcmToken")
      .lean();
  }
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

export const deleteCompatibilityService = async (id: string, userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid compatibility result ID");
  }

  // Find the document
  const existingDoc = await CompatibilityResultModel.findById(id);
  if (!existingDoc) {
    throw new Error("Compatibility result not found");
  }

  // Check authorization
  if (existingDoc.userId.toString() !== userId) {
    throw new Error("Unauthorized: You cannot delete this compatibility result");
  }

  // Delete the document
  await CompatibilityResultModel.findByIdAndDelete(id);

  return { success: true, message: "Compatibility result deleted successfully" };
};
