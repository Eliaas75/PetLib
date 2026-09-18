import express from "express";
import mongoose from "mongoose";
import { Practitioner } from "../models/Practitioner.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { clinicId, species, consultationType, specialty } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);

    const filter = { active: true, verified: true };
    if (clinicId && mongoose.Types.ObjectId.isValid(clinicId)) filter.clinicIds = clinicId;
    if (species) filter.acceptedSpecies = species;
    if (consultationType) filter.consultationTypes = consultationType;
    if (specialty) filter.specialties = String(specialty);

    const practitioners = await Practitioner.find(filter)
      .populate("clinicIds", "name slug address location consultationTypes acceptedSpecies emergencyCapability verified")
      .sort({ rating: -1, reviewsCount: -1, displayName: 1 })
      .limit(limit)
      .lean();

    return res.json({ practitioners });
  } catch (error) {
    console.error("practitioners_list_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Identifiant praticien invalide" });
  }

  try {
    const practitioner = await Practitioner.findOne({ _id: req.params.id, active: true, verified: true })
      .populate("clinicIds", "name slug address location phone email website openingHours services equipment consultationTypes acceptedSpecies emergencyCapability homeVisitRadiusKm verified rating reviewsCount")
      .lean();

    if (!practitioner) return res.status(404).json({ error: "Praticien introuvable" });
    return res.json({ practitioner });
  } catch (error) {
    console.error("practitioner_get_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
