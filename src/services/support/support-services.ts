import { supportModel } from "src/models/support/support-schema";

export const supportService = {
  // Create a new support request
  createSupportRequest: async (payload: any) => {
    const { userId, fullName, email, subject, message } = payload;

    const newSupport = await supportModel.create({
      userId,
      fullName,
      email,
      subject,
      message,
    });

    return newSupport;
  },

  getAllSupportRequests:async()=>{
    return await supportModel.find({status:"Pending"}).populate("userId","-password -fcmToken -stripeCustomerId -__v").sort({createdAt:-1})
  },

  // Get all support requests for a user
  getUserSupportRequests: async (userId: string) => {
    return await supportModel.find({ userId }).sort({ createdAt: -1 });
  },
 
  // Admin: Update support status or add reply
  updateSupportStatus: async (supportId: string, updatePayload: any) => {
    return await supportModel.findByIdAndUpdate(
      supportId,
      { $set: updatePayload },
      { new: true }
    );
  },
};
