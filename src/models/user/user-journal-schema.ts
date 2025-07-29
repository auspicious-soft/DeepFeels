import mongoose from "mongoose";

const journalSchema = new mongoose.Schema({
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"user",
    required:true
  },
  date:{
    type:Date,
    required:true,    
  },
  title:{
    type:String,
    required:true
  },
  content:{
    type:String,
    required:true
  }
},{
  timestamps:true
})

export const UserJournalModel = mongoose.model("userJournal",journalSchema)