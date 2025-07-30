import mongoose, { Document } from "mongoose";

export interface ChatDocument extends Document {
  userId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  modelUsed: string;
  imageUrl: string;
  content: string;
  createdAt: Date;
}

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    modelUsed: {
      type: String,
      required: true,
      default: "gpt-4",
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const chatModel = mongoose.model<ChatDocument>("chat", chatSchema);
