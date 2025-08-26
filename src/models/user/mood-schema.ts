import mongoose from "mongoose";

const moodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  date: {
    type: Date,
    required: true,
  },
  mood: {
    type: String,
    enum: ["Low", "Neutral", "Calm", "Grateful", "Glowing", "Not Recorded"],
    required: true
  },
  note: {
    type: String,
    default:null
  }
});

// Automatically set a default note based on mood if not provided
moodSchema.pre("save", function (next) {
  if (this.mood === "Not Recorded" && (!this.note || this.note.trim() === "")) {
    this.note = "The mood was not recorded";
  }
  next();
});

export const moodModel = mongoose.model("mood", moodSchema);
