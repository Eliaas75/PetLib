import mongoose from "mongoose";

const speciesValues = ["dog", "cat", "rabbit", "bird", "reptile", "rodent", "ferret", "equine", "farm", "other"];
const consultationTypeValues = ["clinic", "tele", "home", "farm"];

const OpeningHoursSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, default: "" },
    close: { type: String, default: "" },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const GeoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: "location.coordinates must be [longitude, latitude]",
      },
    },
  },
  { _id: false }
);

const ClinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", trim: true },
    address: {
      line1: { type: String, default: "", trim: true },
      line2: { type: String, default: "", trim: true },
      postalCode: { type: String, default: "", trim: true, index: true },
      city: { type: String, default: "", trim: true, index: true },
      country: { type: String, default: "France", trim: true },
    },
    location: { type: GeoPointSchema, default: undefined },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    website: { type: String, default: "", trim: true },
    acceptedSpecies: [{ type: String, enum: speciesValues }],
    consultationTypes: [{ type: String, enum: consultationTypeValues }],
    equipment: [{ type: String, trim: true }],
    services: [{ type: String, trim: true }],
    openingHours: [OpeningHoursSchema],
    emergencyCapability: { type: Boolean, default: false, index: true },
    homeVisitRadiusKm: { type: Number, min: 0, default: 0 },
    verified: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

ClinicSchema.index({ location: "2dsphere" }, { sparse: true });
ClinicSchema.index({ "address.city": 1, active: 1, verified: 1 });
ClinicSchema.index({ acceptedSpecies: 1, consultationTypes: 1, active: 1 });

export const Clinic = mongoose.model("Clinic", ClinicSchema);
