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
    default: ""
  }
});

// Automatically set a default note based on mood if not provided
moodSchema.pre("save", function (next) {
  if (!this.note || this.note.trim() === "") {
    switch (this.mood) {
      case "Low":
        this.note = "Feeling low today. Take it easy and rest.";
        break;
      case "Neutral":
        this.note = "I got through today. Not good, not bad — just steady.";
        break;
      case "Calm":
        this.note = "I did what I needed and gave myself grace.";
        break;
      case "Grateful":
        this.note = "I got a lot done and still found small joys.";
        break;
      case "Glowing":
        this.note = "I felt fully alive and proud of what I moved through today.";
        break;
      case "Not Recorded":
        this.note = "The mood was not recorded";
        break;
      default:
        this.note = "";
    }
  }
  next();
});

export const moodModel = mongoose.model("mood", moodSchema);
