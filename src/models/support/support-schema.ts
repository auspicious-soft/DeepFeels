import mongoose from "mongoose"

const supportSchema = new mongoose.Schema({
  userId :{
    type:mongoose.Schema.Types.ObjectId,
    ref:"user",
    required:true
  },
  fullName:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true
  },
  subject:{
    type:String,
    required:true
  },
  message:{
    type:String,
    required:true
  },
  status:{
    type:String,
    enum:["Pending","Resolved","Declined"],
    default:"Pending"
  },
  adminReply:{
    type:String,
    default:null
  }
},{
  timestamps:true
})

export const supportModel = mongoose.model("support",supportSchema)