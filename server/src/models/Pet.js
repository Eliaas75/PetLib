import mongoose from "mongoose";

const PetSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    species: {
      type: String,
      enum: ["dog", "cat", "rabbit", "bird", "reptile", "rodent", "ferret", "equine", "farm", "other"],
      required: true,
      index: true,
    },
    breed: { type: String, default: "", trim: true },
    subtype: { type: String, default: "", trim: true },
    birthDate: { type: Date },
    sex: { type: String, enum: ["female", "male", "unknown"], default: "unknown" },
    weightKg: { type: Number, min: 0 },
    identificationNumber: { type: String, default: "", trim: true },
    allergies: [{ type: String, trim: true }],
    treatments: [{ type: String, trim: true }],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Pet = mongoose.model("Pet", PetSchema);
