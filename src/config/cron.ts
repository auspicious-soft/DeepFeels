import cron from "node-cron";
import { moodModel } from "src/models/user/mood-schema";
import { UserModel } from "src/models/user/user-schema";

export const startCronJob = () => {
  // Run every day at 1 AM
  cron.schedule("0 1 * * *", async () => {
    console.log("Running daily mood check cron job 🕐");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const allUsers = await UserModel.find({
      isUserInfoComplete: true,
      stripeCustomerId: { $ne: null },
      isCardSetupComplete: true,
      hasUsedTrial: true,
      isDeleted:false,
    }); // adjust if needed

    for (const user of allUsers) {
      const existingMood = await moodModel.findOne({
        userId: user._id,
        date: {
          $gte: yesterday,
          $lte: endOfYesterday,
        },
      });

      if (!existingMood) {
        await moodModel.create({
          userId: user._id,
          date: new Date(yesterday), // date-only version
          mood: "Not Recorded", // triggers default note
        });

        console.log(`Mood set as 'Not Recorded' for user ${user._id}`);
      }
    }

    console.log("Daily mood cron job completed ✅");
  });
};
