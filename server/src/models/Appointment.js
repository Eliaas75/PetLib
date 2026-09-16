import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "Practitioner", required: true, index: true },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "AvailabilitySlot", required: true, index: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    consultationType: { type: String, enum: ["clinic", "tele", "home", "farm"], required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "confirmed",
      index: true,
    },
    source: { type: String, enum: ["direct", "waitlist"], default: "direct" },
    ownerNotes: { type: String, default: "", trim: true },
    cancellation: {
      at: { type: Date, default: null },
      by: { type: String, enum: ["owner", "practitioner", "clinic", "system", null], default: null },
      reason: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

AppointmentSchema.index({ ownerId: 1, startsAt: -1 });
AppointmentSchema.index({ practitionerId: 1, startsAt: 1, status: 1 });
AppointmentSchema.index({ clinicId: 1, startsAt: 1, status: 1 });

export const Appointment = mongoose.model("Appointment", AppointmentSchema);
