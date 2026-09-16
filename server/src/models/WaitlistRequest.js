import mongoose from "mongoose";

const WaitlistRequestSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    species: { type: String, required: true, index: true },
    reason: { type: String, required: true, trim: true, index: true },
    consultationTypes: [{ type: String, enum: ["clinic", "tele", "home", "farm"] }],
    city: { type: String, default: "", trim: true, index: true },
    postalCode: { type: String, default: "", trim: true, index: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: undefined,
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    maxDistanceKm: { type: Number, min: 1, max: 100, default: 20 },
    preferredClinicIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clinic" }],
    preferredPractitionerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Practitioner" }],
    startsAfter: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "offered", "booked", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    activeOfferId: { type: mongoose.Schema.Types.ObjectId, ref: "WaitlistOffer", default: null },
    bookedAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
  },
  { timestamps: true }
);

WaitlistRequestSchema.index({ status: 1, species: 1, reason: 1, startsAfter: 1, expiresAt: 1, createdAt: 1 });
WaitlistRequestSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
WaitlistRequestSchema.index({ location: "2dsphere" }, { sparse: true });

export const WaitlistRequest = mongoose.model("WaitlistRequest", WaitlistRequestSchema);
