import express from "express";
import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { ClinicMembership } from "../models/ClinicMembership.js";
import { Practitioner } from "../models/Practitioner.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("practitioner", "clinic_admin", "admin"));

async function professionalContext(req) {
  const practitioner = await Practitioner.findOne({ userId: req.auth.userId }).lean();
  const memberships = await ClinicMembership.find({ userId: req.auth.userId, status: "active" }).lean();
  return {
    role: req.auth.role,
    practitioner,
    clinicIds: memberships.map((membership) => membership.clinicId),
  };
}

function appointmentScope(ctx) {
  if (ctx.role === "admin") return {};
  if (ctx.role === "practitioner") {
    return ctx.practitioner ? { practitionerId: ctx.practitioner._id } : { _id: null };
  }
  return ctx.clinicIds.length ? { clinicId: { $in: ctx.clinicIds } } : { _id: null };
}

function populateAppointment(query) {
  return query
    .populate("petId", "name species breed subtype")
    .populate("clinicId", "name slug address")
    .populate("practitionerId", "displayName title")
    .populate("slotId", "startsAt endsAt consultationType status");
}

router.patch("/:id/status", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Rendez-vous invalide" });
  }

  const targetStatus = String(req.body?.status || "");
  if (!["confirmed", "completed", "no_show"].includes(targetStatus)) {
    return res.status(400).json({ error: "Statut professionnel invalide" });
  }

  try {
    const ctx = await professionalContext(req);
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      ...appointmentScope(ctx),
    });

    if (!appointment) return res.status(404).json({ error: "Rendez-vous introuvable ou non autorisé" });
    if (["cancelled", "completed", "no_show"].includes(appointment.status)) {
      return res.status(409).json({ error: "Ce rendez-vous est déjà terminé" });
    }

    if (targetStatus === "confirmed" && appointment.status !== "pending") {
      return res.status(409).json({ error: "Seul un rendez-vous en attente peut être confirmé" });
    }

    if (["completed", "no_show"].includes(targetStatus)) {
      if (!["pending", "confirmed"].includes(appointment.status)) {
        return res.status(409).json({ error: "Ce rendez-vous ne peut pas être clôturé" });
      }
      if (appointment.startsAt > new Date()) {
        return res.status(409).json({ error: "Le rendez-vous n’a pas encore commencé" });
      }
    }

    appointment.status = targetStatus;
    await appointment.save();

    const updated = await populateAppointment(Appointment.findById(appointment._id)).lean();
    return res.json({ appointment: updated });
  } catch (error) {
    console.error("pro_appointment_status_error", error);
    return res.status(500).json({ error: "Impossible de mettre à jour le rendez-vous" });
  }
});

export default router;
