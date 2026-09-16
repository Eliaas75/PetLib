import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    role: {
      type: String,
      enum: ["owner", "practitioner", "clinic_admin", "admin"],
      default: "owner",
      index: true,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
