import mongoose from "mongoose";

const speciesValues = ["dog", "cat", "rabbit", "bird", "reptile", "rodent", "ferret", "equine", "farm", "other"];
const consultationTypeValues = ["clinic", "tele", "home", "farm"];

const PricingSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    amountCents: { type: Number, min: 0, required: true },
    consultationType: { type: String, enum: consultationTypeValues, default: "clinic" },
    currency: { type: String, enum: ["EUR"], default: "EUR" },
  },
  { _id: false }
);

const PractitionerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, unique: true, sparse: true },
    clinicIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clinic", index: true }],
    displayName: { type: String, required: true, trim: true, index: true },
    title: { type: String, default: "Vétérinaire", trim: true },
    bio: { type: String, default: "", trim: true },
    specialties: [{ type: String, trim: true }],
    acceptedSpecies: [{ type: String, enum: speciesValues }],
    consultationTypes: [{ type: String, enum: consultationTypeValues }],
    languages: [{ type: String, trim: true }],
    pricing: [PricingSchema],
    verified: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

PractitionerSchema.index({ acceptedSpecies: 1, consultationTypes: 1, active: 1 });
PractitionerSchema.index({ clinicIds: 1, active: 1 });

export const Practitioner = mongoose.model("Practitioner", PractitionerSchema);
