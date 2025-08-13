import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const JournalEncryptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  journalEncryption: {
    type: Boolean,
    default: false
  },
  journalEncryptionPassword: {
    type: String,
    default: null
  }
});

// Pre-save hook to hash password if modified
JournalEncryptionSchema.pre("save", async function (next) {
  if (this.isModified("journalEncryptionPassword") && this.journalEncryptionPassword) {
    const salt = await bcrypt.genSalt(10);
    this.journalEncryptionPassword = await bcrypt.hash(this.journalEncryptionPassword, salt);
  }
  next();
});

export const JournalEncryptionModel = mongoose.model("JournalEncryption", JournalEncryptionSchema);
