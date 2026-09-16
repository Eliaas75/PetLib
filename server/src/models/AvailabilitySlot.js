import mongoose from "mongoose";

const speciesValues = ["dog", "cat", "rabbit", "bird", "reptile", "rodent", "ferret", "equine", "farm", "other"];
const consultationTypeValues = ["clinic", "tele", "home", "farm"];

const AvailabilitySlotSchema = new mongoose.Schema(
  {
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "Practitioner", required: true, index: true },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    consultationType: { type: String, enum: consultationTypeValues, required: true, index: true },
    acceptedSpecies: [{ type: String, enum: speciesValues }],
    allowedReasons: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["available", "held", "booked", "blocked"],
      default: "available",
      index: true,
    },
    holdExpiresAt: { type: Date, default: null, index: true },
    waitlistOfferId: { type: mongoose.Schema.Types.ObjectId, ref: "WaitlistOffer", default: null, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
  },
  { timestamps: true }
);

AvailabilitySlotSchema.pre("validate", function validateTimes(next) {
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) {
    return next(new Error("endsAt must be after startsAt"));
  }
  return next();
});

AvailabilitySlotSchema.index({ practitionerId: 1, startsAt: 1 }, { unique: true });
AvailabilitySlotSchema.index({ clinicId: 1, status: 1, startsAt: 1 });
AvailabilitySlotSchema.index({ acceptedSpecies: 1, consultationType: 1, status: 1, startsAt: 1 });

export const AvailabilitySlot = mongoose.model("AvailabilitySlot", AvailabilitySlotSchema);
