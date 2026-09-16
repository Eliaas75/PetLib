import express from "express";
import mongoose from "mongoose";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";

const router = express.Router();

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const defaultTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const from = parseDate(req.query.from, now);
    const to = parseDate(req.query.to, defaultTo);

    if (!from || !to || to <= from) {
      return res.status(400).json({ error: "Fenêtre de disponibilité invalide" });
    }

    const maxWindowMs = 31 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxWindowMs) {
      return res.status(400).json({ error: "La fenêtre maximale est de 31 jours" });
    }

    const filter = {
      status: "available",
      startsAt: { $gte: from, $lte: to },
    };

    const { practitionerId, clinicId, species, consultationType, reason } = req.query;

    if (practitionerId) {
      if (!mongoose.Types.ObjectId.isValid(practitionerId)) {
        return res.status(400).json({ error: "Identifiant praticien invalide" });
      }
      filter.practitionerId = practitionerId;
    }

    if (clinicId) {
      if (!mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({ error: "Identifiant clinique invalide" });
      }
      filter.clinicId = clinicId;
    }

    if (consultationType) filter.consultationType = consultationType;
    if (species) {
      filter.$or = [{ acceptedSpecies: species }, { acceptedSpecies: { $size: 0 } }];
    }

    if (reason) {
      const reasonCondition = [{ allowedReasons: String(reason) }, { allowedReasons: { $size: 0 } }];
      if (filter.$or) filter.$and = [{ $or: filter.$or }, { $or: reasonCondition }];
      else filter.$or = reasonCondition;
      if (filter.$and) delete filter.$or;
    }

    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const slots = await AvailabilitySlot.find(filter)
      .populate("practitionerId", "displayName title acceptedSpecies consultationTypes specialties verified rating reviewsCount")
      .populate("clinicId", "name slug address location consultationTypes acceptedSpecies emergencyCapability verified")
      .sort({ startsAt: 1 })
      .limit(limit)
      .lean();

    return res.json({ from, to, slots });
  } catch (error) {
    console.error("availability_list_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
