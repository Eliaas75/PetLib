import express from "express";
import mongoose from "mongoose";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { ClinicMembership } from "../models/ClinicMembership.js";
import { Practitioner } from "../models/Practitioner.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { offerSlotToWaitlist } from "../services/waitlist.js";

const router = express.Router();
const speciesValues = new Set(["dog", "cat", "rabbit", "bird", "reptile", "rodent", "ferret", "equine", "farm", "other"]);
const consultationTypeValues = new Set(["clinic", "tele", "home", "farm"]);

router.use(requireAuth, requireRole("practitioner", "clinic_admin", "admin"));

function text(value, max = 100) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function stringList(values, maxItems = 30, maxLength = 100) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => text(value, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function enumList(values, allowed) {
  return stringList(values).filter((value) => allowed.has(value));
}

async function professionalContext(req) {
  const practitioner = await Practitioner.findOne({ userId: req.auth.userId });
  const memberships = await ClinicMembership.find({ userId: req.auth.userId, status: "active" }).lean();
  return {
    role: req.auth.role,
    practitioner,
    clinicIds: memberships.map((membership) => String(membership.clinicId)),
  };
}

async function targetPractitioner(req, ctx) {
  if (ctx.role === "practitioner") return ctx.practitioner;
  const practitionerId = req.body?.practitionerId;
  if (!mongoose.Types.ObjectId.isValid(practitionerId)) return null;

  if (ctx.role === "admin") return Practitioner.findById(practitionerId);
  return Practitioner.findOne({ _id: practitionerId, clinicIds: { $in: ctx.clinicIds } });
}

function slotScope(ctx) {
  if (ctx.role === "admin") return {};
  if (ctx.role === "practitioner") {
    return ctx.practitioner ? { practitionerId: ctx.practitioner._id } : { _id: null };
  }
  return ctx.clinicIds.length ? { clinicId: { $in: ctx.clinicIds } } : { _id: null };
}

router.post("/bulk", async (req, res) => {
  try {
    const ctx = await professionalContext(req);
    const practitioner = await targetPractitioner(req, ctx);
    if (!practitioner) return res.status(409).json({ error: "Profil praticien requis ou praticien non autorisé" });

    const clinicId = req.body?.clinicId;
    if (!mongoose.Types.ObjectId.isValid(clinicId)) return res.status(400).json({ error: "Structure invalide" });

    const practitionerClinicIds = (practitioner.clinicIds || []).map(String);
    if (ctx.role !== "admin" && !practitionerClinicIds.includes(String(clinicId))) {
      return res.status(403).json({ error: "Cette structure n’est pas rattachée au praticien" });
    }
    if (ctx.role === "clinic_admin" && !ctx.clinicIds.includes(String(clinicId))) {
      return res.status(403).json({ error: "Accès refusé à cette structure" });
    }

    const consultationType = text(req.body?.consultationType, 20);
    if (!consultationTypeValues.has(consultationType)) {
      return res.status(400).json({ error: "Type de consultation invalide" });
    }

    const rawSlots = Array.isArray(req.body?.slots) ? req.body.slots : [];
    if (!rawSlots.length || rawSlots.length > 96) {
      return res.status(400).json({ error: "Entre 1 et 96 créneaux sont requis" });
    }

    const now = new Date();
    const oneYear = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
    const parsed = rawSlots
      .map((slot) => ({ startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) }))
      .sort((a, b) => a.startsAt - b.startsAt);

    for (let index = 0; index < parsed.length; index += 1) {
      const slot = parsed[index];
      const durationMinutes = (slot.endsAt - slot.startsAt) / 60000;
      if (Number.isNaN(slot.startsAt.getTime()) || Number.isNaN(slot.endsAt.getTime())) {
        return res.status(400).json({ error: "Date de créneau invalide" });
      }
      if (slot.startsAt <= now || slot.startsAt > oneYear) {
        return res.status(400).json({ error: "Les créneaux doivent être futurs et situés dans les 12 prochains mois" });
      }
      if (durationMinutes < 10 || durationMinutes > 240) {
        return res.status(400).json({ error: "La durée d’un créneau doit être comprise entre 10 minutes et 4 heures" });
      }
      if (index > 0 && parsed[index - 1].endsAt > slot.startsAt) {
        return res.status(409).json({ error: "Les créneaux proposés se chevauchent" });
      }
    }

    const minStart = parsed[0].startsAt;
    const maxEnd = parsed[parsed.length - 1].endsAt;
    const existingOverlap = await AvailabilitySlot.findOne({
      practitionerId: practitioner._id,
      startsAt: { $lt: maxEnd },
      endsAt: { $gt: minStart },
    }).lean();

    if (existingOverlap) {
      return res.status(409).json({ error: "Au moins un créneau existe déjà sur cette période" });
    }

    const acceptedSpecies = enumList(req.body?.acceptedSpecies, speciesValues);
    const allowedReasons = stringList(req.body?.allowedReasons, 20, 80);

    const docs = parsed.map((slot) => ({
      practitionerId: practitioner._id,
      clinicId,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      consultationType,
      acceptedSpecies,
      allowedReasons,
      status: "available",
    }));

    const slots = await AvailabilitySlot.insertMany(docs, { ordered: true });
    return res.status(201).json({ created: slots.length, slots });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Un créneau existe déjà à cette heure" });
    console.error("pro_availability_bulk_create_error", error);
    return res.status(500).json({ error: "Impossible de créer les créneaux" });
  }
});

router.patch("/:id/block", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Créneau invalide" });

  try {
    const ctx = await professionalContext(req);
    const now = new Date();
    const slot = await AvailabilitySlot.findOneAndUpdate(
      {
        _id: req.params.id,
        ...slotScope(ctx),
        status: "available",
        startsAt: { $gt: now },
      },
      { $set: { status: "blocked", holdExpiresAt: null, waitlistOfferId: null } },
      { new: true }
    ).lean();

    if (!slot) return res.status(409).json({ error: "Seul un créneau futur et libre peut être bloqué" });
    return res.json({ slot });
  } catch (error) {
    console.error("pro_availability_block_error", error);
    return res.status(500).json({ error: "Impossible de bloquer ce créneau" });
  }
});

router.patch("/:id/reopen", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Créneau invalide" });

  try {
    const ctx = await professionalContext(req);
    const slot = await AvailabilitySlot.findOneAndUpdate(
      {
        _id: req.params.id,
        ...slotScope(ctx),
        status: "blocked",
        startsAt: { $gt: new Date() },
      },
      { $set: { status: "available" } },
      { new: true }
    ).lean();

    if (!slot) return res.status(409).json({ error: "Ce créneau ne peut pas être rouvert" });

    offerSlotToWaitlist(slot._id).catch((matchError) =>
      console.error("waitlist_match_after_slot_reopen_error", matchError)
    );

    return res.json({ slot });
  } catch (error) {
    console.error("pro_availability_reopen_error", error);
    return res.status(500).json({ error: "Impossible de rouvrir ce créneau" });
  }
});

export default router;
