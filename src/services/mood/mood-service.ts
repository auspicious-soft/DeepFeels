import { moodModel } from "src/models/user/mood-schema";


export const moodServices = {
  // Create or update today's mood
  createOrUpdateMood: async (payload: any) => {
    const { userId, mood,description } = payload;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const existingMood = await moodModel.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

     if (existingMood) {
      existingMood.mood = mood;

      // Update note only if description provided
      if (description && description.trim() !== "") {
        existingMood.note = description.trim();
      } else {
        existingMood.note = null; 
      }

      await existingMood.save();
      return existingMood;
    }

    const newMood = await moodModel.create({
      userId,
      date: new Date(),
      mood,
      note: description && description.trim() !== "" ? description.trim() : null,
    });

    return newMood;
  },

  // Get today's mood
  getTodayMood: async (userId: string) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return await moodModel.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });
  },

  // Get all moods for a user
  getAllMoods: async (userId: string) => {
    return await moodModel.find({ userId }).sort({ date: -1 });
  },

  // Get moods by month
  getMoodsByMonth: async (userId: string, month: number, year: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return await moodModel.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });
  },
};
