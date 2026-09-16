import express from "express";
import { Clinic } from "../models/Clinic.js";
import { Practitioner } from "../models/Practitioner.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";

const router = express.Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveSpecies(rawSpecies) {
  if (!rawSpecies || rawSpecies === "all" || rawSpecies === "vet") return [];
  if (rawSpecies === "nac") return ["rabbit", "bird", "reptile", "rodent", "ferret"];
  if (rawSpecies === "ferme") return ["farm"];
  if (rawSpecies === "equide") return ["equine"];
  return [String(rawSpecies)];
}

function arrayMatch(values) {
  if (values.length === 1) return values[0];
  return { $in: values };
}

function buildFlexibleArrayCondition(field, values) {
  return { $or: [{ [field]: arrayMatch(values) }, { [field]: { $size: 0 } }] };
}

router.get("/", async (req, res) => {
  try {
    const {
      city,
      species,
      consultationType,
      reason,
      emergency,
      lat,
      lng,
    } = req.query;

    const speciesValues = resolveSpecies(species);
    const distanceKm = Math.min(Math.max(Number(req.query.distanceKm || 20), 1), 100);
    const availabilityDays = Math.min(Math.max(Number(req.query.availabilityDays || 7), 1), 31);
    const now = new Date();
    const to = new Date(now.getTime() + availabilityDays * 24 * 60 * 60 * 1000);

    const clinicFilter = { active: true, verified: true };
    if (city) {
      const place = String(city).trim();
      if (/^\d{5}$/.test(place)) clinicFilter["address.postalCode"] = place;
      else clinicFilter["address.city"] = new RegExp(`^${escapeRegex(place)}$`, "i");
    }
    if (speciesValues.length) clinicFilter.acceptedSpecies = arrayMatch(speciesValues);
    if (consultationType) clinicFilter.consultationTypes = consultationType;
    if (String(emergency).toLowerCase() === "true") clinicFilter.emergencyCapability = true;

    const latitude = Number(lat);
    const longitude = Number(lng);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

    if (hasCoordinates) {
      clinicFilter.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: distanceKm * 1000,
        },
      };
    }

    let clinicQuery = Clinic.find(clinicFilter).limit(50);
    if (!hasCoordinates) clinicQuery = clinicQuery.sort({ rating: -1, reviewsCount: -1, name: 1 });
    const clinics = await clinicQuery.lean();

    if (clinics.length === 0) {
      return res.json({ query: { city, species, consultationType, reason, availabilityDays, distanceKm }, results: [] });
    }

    const clinicIds = clinics.map((clinic) => clinic._id);
    const practitionerFilter = {
      active: true,
      verified: true,
      clinicIds: { $in: clinicIds },
    };
    if (speciesValues.length) practitionerFilter.acceptedSpecies = arrayMatch(speciesValues);
    if (consultationType) practitionerFilter.consultationTypes = consultationType;

    const practitioners = await Practitioner.find(practitionerFilter)
      .sort({ rating: -1, reviewsCount: -1, displayName: 1 })
      .limit(100)
      .lean();

    if (practitioners.length === 0) {
      return res.json({ query: { city, species, consultationType, reason, availabilityDays, distanceKm }, results: [] });
    }

    const practitionerIds = practitioners.map((practitioner) => practitioner._id);
    const slotConditions = [
      { status: "available" },
      { startsAt: { $gte: now, $lte: to } },
      { practitionerId: { $in: practitionerIds } },
      { clinicId: { $in: clinicIds } },
    ];

    if (consultationType) slotConditions.push({ consultationType });
    if (speciesValues.length) slotConditions.push(buildFlexibleArrayCondition("acceptedSpecies", speciesValues));
    if (reason) slotConditions.push(buildFlexibleArrayCondition("allowedReasons", [String(reason)]));

    const slots = await AvailabilitySlot.find({ $and: slotConditions })
      .sort({ startsAt: 1 })
      .limit(1000)
      .lean();

    const clinicsById = new Map(clinics.map((clinic) => [clinic._id.toString(), clinic]));
    const slotsByPractitioner = new Map();

    for (const slot of slots) {
      const key = slot.practitionerId.toString();
      const current = slotsByPractitioner.get(key) || [];
      if (current.length < 5) current.push(slot);
      slotsByPractitioner.set(key, current);
    }

    const results = practitioners.map((practitioner) => {
      const practitionerClinics = practitioner.clinicIds
        .map((id) => clinicsById.get(id.toString()))
        .filter(Boolean);
      const nextSlots = slotsByPractitioner.get(practitioner._id.toString()) || [];

      return {
        practitioner,
        clinics: practitionerClinics,
        nextSlots,
        nextAvailableAt: nextSlots[0]?.startsAt || null,
      };
    });

    results.sort((a, b) => {
      if (a.nextAvailableAt && !b.nextAvailableAt) return -1;
      if (!a.nextAvailableAt && b.nextAvailableAt) return 1;
      if (a.nextAvailableAt && b.nextAvailableAt) {
        const dateDifference = new Date(a.nextAvailableAt) - new Date(b.nextAvailableAt);
        if (dateDifference !== 0) return dateDifference;
      }
      return (b.practitioner.rating || 0) - (a.practitioner.rating || 0);
    });

    return res.json({
      query: { city, species, consultationType, reason, availabilityDays, distanceKm },
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("search_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
