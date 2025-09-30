import cron from "node-cron";
import { moodModel } from "src/models/user/mood-schema";
import { UserModel } from "src/models/user/user-schema";

export const startCronJob = () => {
  
  // Run every day at 1 AM
  cron.schedule("0 1 * * *", async () => {
    
    try {
      // Create yesterday's date range more carefully
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Set to start of yesterday (00:00:00.000)
      const startOfYesterday = new Date(yesterday);
      startOfYesterday.setHours(0, 0, 0, 0);
      
      // Set to end of yesterday (23:59:59.999)
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

  
      // Find eligible users with better error handling
      const allUsers = await UserModel.find({
        isUserInfoComplete: true,
        stripeCustomerId: { $ne: null, $exists: true },
        isCardSetupComplete: true,
        hasUsedTrial: true,
        isDeleted: false, // Make sure this matches your schema exactly
      }).select('_id fullName email'); // Only select needed fields for performance

    
      if (allUsers.length === 0) {
        return;
      }

      let processedCount = 0;
      let createdCount = 0;
      let errorCount = 0;

      for (const user of allUsers) {
        try {
          // Check if mood record already exists for yesterday
          const existingMood = await moodModel.findOne({
            userId: user._id,
            date: {
              $gte: startOfYesterday,
              $lte: endOfYesterday,
            },
          });

          if (!existingMood) {
            // Create new mood record
            const newMood = await moodModel.create({
              userId: user._id,
              date: startOfYesterday, // Use start of yesterday for consistency
              mood: "Not Recorded",
            });

            createdCount++;
          } else {
            console.log(`⏭️  Mood already exists for user ${user._id} (${user.email}): ${existingMood.mood}`);
          }
          
          processedCount++;
        } catch (userError) {
          console.error(`❌ Error processing user ${user._id} (${user.email}):`, userError);
          errorCount++;
        }
      }

       
    } catch (error) {
      console.error("❌ Fatal error in daily mood cron job:", error);
    }
  });

 console.log("Daily mood check cron job scheduled successfully ✅");
};

// Alternative: Test function to run immediately (for debugging)
export const testMoodCronJob = async () => {
  
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    // Test user query
    const userCount = await UserModel.countDocuments({
      isUserInfoComplete: true,
      stripeCustomerId: { $ne: null, $exists: true },
      isCardSetupComplete: true,
      hasUsedTrial: true,
      isDeleted: false,
    });

    // Test mood query for one user (if any exists)
    const sampleUser = await UserModel.findOne({
      isUserInfoComplete: true,
      stripeCustomerId: { $ne: null, $exists: true },
      isCardSetupComplete: true,
      hasUsedTrial: true,
      isDeleted: false,
    });

    if (sampleUser) {
      const existingMood = await moodModel.findOne({
        userId: sampleUser._id,
        date: {
          $gte: startOfYesterday,
          $lte: endOfYesterday,
        },
      });

      console.log(`Sample user ${sampleUser._id} mood status:`, existingMood ? 'Has mood record' : 'No mood record');
    }

    console.log("🧪 Test completed");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};