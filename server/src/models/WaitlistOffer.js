import mongoose from "mongoose";

const WaitlistOfferSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: "WaitlistRequest", required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: "AvailabilitySlot", required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["offered", "accepted", "expired", "declined", "cancelled"],
      default: "offered",
      index: true,
    },
    acceptedAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", default: null },
  },
  { timestamps: true }
);

WaitlistOfferSchema.index({ ownerId: 1, status: 1, expiresAt: 1 });
WaitlistOfferSchema.index({ slotId: 1, status: 1 });
WaitlistOfferSchema.index({ requestId: 1, status: 1 });

export const WaitlistOffer = mongoose.model("WaitlistOffer", WaitlistOfferSchema);
