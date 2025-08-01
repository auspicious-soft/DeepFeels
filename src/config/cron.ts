import cron from "node-cron";
import { moodModel } from "src/models/user/mood-schema";
import { UserModel } from "src/models/user/user-schema";

export const startCronJob = () => {
  console.log("Initializing daily mood check cron job...");
  
  // Run every day at 1 AM
  cron.schedule("0 1 * * *", async () => {
    console.log(`Running daily mood check cron job at ${new Date().toISOString()} 🕐`);
    
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

      console.log(`Checking for mood records between ${startOfYesterday.toISOString()} and ${endOfYesterday.toISOString()}`);

      // Find eligible users with better error handling
      const allUsers = await UserModel.find({
        isUserInfoComplete: true,
        stripeCustomerId: { $ne: null, $exists: true },
        isCardSetupComplete: true,
        hasUsedTrial: true,
        isDeleted: false, // Make sure this matches your schema exactly
      }).select('_id fullName email'); // Only select needed fields for performance

      console.log(`Found ${allUsers.length} eligible users`);

      if (allUsers.length === 0) {
        console.log("No eligible users found. Cron job completed.");
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

            console.log(`✅ Created 'Not Recorded' mood for user ${user._id} (${user.email})`);
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

      console.log(`Daily mood cron job completed ✅`);
      console.log(`📊 Summary: ${processedCount} users processed, ${createdCount} mood records created, ${errorCount} errors`);
      
    } catch (error) {
      console.error("❌ Fatal error in daily mood cron job:", error);
    }
  });

  console.log("Daily mood check cron job scheduled successfully ✅");
};

// Alternative: Test function to run immediately (for debugging)
export const testMoodCronJob = async () => {
  console.log("🧪 Testing mood cron job logic...");
  
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    console.log(`Testing with date range: ${startOfYesterday.toISOString()} to ${endOfYesterday.toISOString()}`);

    // Test user query
    const userCount = await UserModel.countDocuments({
      isUserInfoComplete: true,
      stripeCustomerId: { $ne: null, $exists: true },
      isCardSetupComplete: true,
      hasUsedTrial: true,
      isDeleted: false,
    });

    console.log(`Found ${userCount} eligible users in database`);

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