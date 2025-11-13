import { supportModel } from "src/models/support/support-schema";
import { resend } from "src/utils/helper";

export const supportService = {
  // Create a new support request
 createSupportRequest: async (payload: any) => {
    const { userId, fullName, email, subject, message } = payload;

    // 1. Save the support request in DB
    const newSupport = await supportModel.create({
      userId,
      fullName,
      email,
      subject,
      message,
    });

    // 2. Send notification email to your support inbox
    try {
      await resend.emails.send({
        from: `Deepfeels Support <hello@deepfeels.net>`,
        to: `hello@deepfeels.net`,
        replyTo: email,                    
        subject: `New Support Request: ${subject}`,
        html: `
          <h2>New Support Request</h2>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      });

      console.log('Support email sent successfully.');
    } catch (error) {
      console.error('Error sending support email:', error);
    }

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
