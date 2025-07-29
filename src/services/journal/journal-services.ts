import { UserJournalModel } from "src/models/user/user-journal-schema";


export const journalServices = {
  // Create or update today's journal entry
  createOrUpdateJournal: async (payload: any) => {
    const { userId, title, content } = payload;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const existingEntry = await UserJournalModel.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingEntry) {
      existingEntry.title = title;
      existingEntry.content = content;
      await existingEntry.save();
      return existingEntry;
    }

    const journal = await UserJournalModel.create({
      userId,
      date: new Date(),
      title,
      content,
    });
    return journal;
  },

  // Get today's journal entry for a user
  getTodayJournal: async (userId: string) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const journal = await UserJournalModel.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    return journal;
  },

  // Get all journals of a user
  getAllJournals: async (userId: string) => {
    return await UserJournalModel.find({ userId }).sort({ date: -1 });
  },

  // get journal by user
  getJournalsByUser:async(userId:string)=>{
    return await UserJournalModel.find({userId}).sort({date:-1})
  },

  // Delete journal by ID
  deleteJournal: async (id: string, userId: string) => {
    const result = await UserJournalModel.findOneAndDelete({ _id: id, userId });
    return result;
  },

  // Get single journal by ID
  getJournalById: async (id: string, userId: string) => {
    return await UserJournalModel.findOne({ _id: id, userId });
  },

  // Update journal by ID
  updateJournalById: async (id: string, userId: string, payload: any) => {
    return await UserJournalModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: payload },
      { new: true }
    );
  },
};
