import mongoose from "mongoose";

const ClinicMembershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true, index: true },
    practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: "Practitioner", default: null, index: true },
    role: {
      type: String,
      enum: ["clinic_admin", "practitioner", "receptionist"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

ClinicMembershipSchema.index({ userId: 1, clinicId: 1 }, { unique: true });
ClinicMembershipSchema.index({ clinicId: 1, status: 1, role: 1 });

export const ClinicMembership = mongoose.model("ClinicMembership", ClinicMembershipSchema);
