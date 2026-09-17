import express from "express";
import mongoose from "mongoose";
import { Clinic } from "../models/Clinic.js";
import { ClinicMembership } from "../models/ClinicMembership.js";
import { Practitioner } from "../models/Practitioner.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth, requireRole("practitioner", "clinic_admin", "admin"));

async function contextFor(req) {
  const practitioner = await Practitioner.findOne({ userId: req.auth.userId }).lean();
  const memberships = await ClinicMembership.find({ userId: req.auth.userId, status: "active" }).lean();

  const clinicIds = new Set();
  for (const id of practitioner?.clinicIds || []) clinicIds.add(String(id));
  for (const membership of memberships) clinicIds.add(String(membership.clinicId));

  return {
    role: req.auth.role,
    practitioner,
    memberships,
    clinicIds: [...clinicIds],
  };
}

function canManageClinic(ctx, clinicId) {
  if (ctx.role === "admin") return true;
  return ctx.memberships.some(
    (membership) =>
      String(membership.clinicId) === String(clinicId) &&
      membership.role === "clinic_admin" &&
      membership.status === "active"
  );
}

router.get("/", async (req, res) => {
  try {
    const ctx = await contextFor(req);
    let clinicIds = ctx.clinicIds;

    if (ctx.role === "admin" && !clinicIds.length) {
      const adminClinics = await Clinic.find({ active: true }).select("_id").limit(100).lean();
      clinicIds = adminClinics.map((clinic) => String(clinic._id));
    }

    if (!clinicIds.length) return res.json({ clinics: [] });

    const [clinics, practitioners, memberships] = await Promise.all([
      Clinic.find({ _id: { $in: clinicIds } })
        .select("name slug address verified active")
        .sort({ name: 1 })
        .lean(),
      Practitioner.find({ clinicIds: { $in: clinicIds }, active: true })
        .populate("userId", "fullName email role")
        .select("displayName title specialties acceptedSpecies consultationTypes verified active clinicIds userId")
        .sort({ displayName: 1 })
        .lean(),
      ClinicMembership.find({ clinicId: { $in: clinicIds }, status: "active" })
        .populate("userId", "fullName email role")
        .populate("practitionerId", "displayName title verified")
        .lean(),
    ]);

    return res.json({
      clinics: clinics.map((clinic) => ({
        ...clinic,
        canManage: canManageClinic(ctx, clinic._id),
        practitioners: practitioners.filter((practitioner) =>
          practitioner.clinicIds.some((id) => String(id) === String(clinic._id))
        ),
        memberships: memberships.filter(
          (membership) => String(membership.clinicId) === String(clinic._id)
        ),
      })),
    });
  } catch (error) {
    console.error("pro_team_get_error", error);
    return res.status(500).json({ error: "Impossible de charger l’équipe" });
  }
});

router.post("/:clinicId/members", requireRole("clinic_admin", "admin"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.clinicId)) {
    return res.status(400).json({ error: "Structure invalide" });
  }

  try {
    const ctx = await contextFor(req);
    if (!canManageClinic(ctx, req.params.clinicId)) {
      return res.status(403).json({ error: "Tu ne peux pas gérer cette structure" });
    }

    const clinic = await Clinic.findById(req.params.clinicId).lean();
    if (!clinic) return res.status(404).json({ error: "Structure introuvable" });

    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email du praticien requis" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "Aucun compte PetLib trouvé avec cet email" });
    }
    if (user.role !== "practitioner") {
      return res.status(409).json({ error: "Ce compte doit être un compte praticien" });
    }

    let practitioner = await Practitioner.findOne({ userId: user._id });
    if (!practitioner) {
      practitioner = await Practitioner.create({
        userId: user._id,
        displayName: user.fullName || user.email,
        title: "Vétérinaire",
        clinicIds: [clinic._id],
        verified: false,
        active: true,
      });
    } else {
      await Practitioner.updateOne(
        { _id: practitioner._id },
        { $addToSet: { clinicIds: clinic._id } }
      );
    }

    const membership = await ClinicMembership.findOneAndUpdate(
      { userId: user._id, clinicId: clinic._id },
      {
        $set: {
          practitionerId: practitioner._id,
          role: "practitioner",
          status: "active",
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    )
      .populate("userId", "fullName email role")
      .populate("practitionerId", "displayName title verified")
      .lean();

    return res.status(201).json({ membership });
  } catch (error) {
    console.error("pro_team_add_member_error", error);
    return res.status(500).json({ error: "Impossible d’ajouter ce praticien" });
  }
});

export default router;
