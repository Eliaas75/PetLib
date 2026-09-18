import express from "express";
import mongoose from "mongoose";
import { Clinic } from "../models/Clinic.js";

const router = express.Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  try {
    const { city, species, consultationType, emergency, lat, lng } = req.query;
    const radiusKm = Math.min(Math.max(Number(req.query.radiusKm || 20), 1), 100);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);

    const filter = { active: true, verified: true };

    if (city) filter["address.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
    if (species) filter.acceptedSpecies = species;
    if (consultationType) filter.consultationTypes = consultationType;
    if (String(emergency).toLowerCase() === "true") filter.emergencyCapability = true;

    const latitude = Number(lat);
    const longitude = Number(lng);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

    if (hasCoordinates) {
      filter.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: radiusKm * 1000,
        },
      };
    }

    let query = Clinic.find(filter).limit(limit);
    if (!hasCoordinates) query = query.sort({ rating: -1, reviewsCount: -1, name: 1 });

    const clinics = await query.lean();
    return res.json({ clinics });
  } catch (error) {
    console.error("clinics_list_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/:idOrSlug", async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const selector = mongoose.Types.ObjectId.isValid(key)
      ? { _id: key, active: true, verified: true }
      : { slug: String(key).toLowerCase(), active: true, verified: true };

    const clinic = await Clinic.findOne(selector).lean();
    if (!clinic) return res.status(404).json({ error: "Clinique introuvable" });
    return res.json({ clinic });
  } catch (error) {
    console.error("clinic_get_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
