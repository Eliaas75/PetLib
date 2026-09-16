import express from "express";
import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Pet } from "../models/Pet.js";
import { WaitlistOffer } from "../models/WaitlistOffer.js";
import { WaitlistRequest } from "../models/WaitlistRequest.js";
import { requireAuth } from "../middleware/auth.js";
import { expireDueOffers, releaseOffer } from "../services/waitlist.js";

const router = express.Router();
const allowedConsultationTypes = new Set(["clinic", "tele", "home", "farm"]);

function validId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function objectIds(values = []) {
  return values
    .filter((value) => validId(value))
    .map((value) => new mongoose.Types.ObjectId(value));
}

function populateAppointment(query) {
  return query
    .populate("petId", "name species breed subtype")
    .populate("practitionerId", "displayName title specialties verified rating reviewsCount")
    .populate("clinicId", "name slug address location phone email verified")
    .populate("slotId", "startsAt endsAt consultationType status");
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    await expireDueOffers();
    const requests = await WaitlistRequest.find({ ownerId: req.auth.userId })
      .populate("petId", "name species breed subtype")
      .populate({
        path: "activeOfferId",
        populate: {
          path: "slotId",
          populate: [
            { path: "clinicId", select: "name slug address location phone verified" },
            { path: "practitionerId", select: "displayName title specialties verified rating" },
          ],
        },
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ requests });
  } catch (error) {
    console.error("waitlist_list_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", async (req, res) => {
  const {
    petId,
    reason,
    consultationTypes,
    city,
    postalCode,
    maxDistanceKm,
    preferredClinicIds,
    preferredPractitionerIds,
    startsAfter,
    expiresAt,
    lat,
    lng,
  } = req.body || {};

  if (!validId(petId)) return res.status(400).json({ error: "Animal invalide" });
  if (!reason || !String(reason).trim()) return res.status(400).json({ error: "Motif requis" });

  const types = Array.isArray(consultationTypes)
    ? consultationTypes.filter((type) => allowedConsultationTypes.has(type))
    : [];

  const clinicIds = objectIds(Array.isArray(preferredClinicIds) ? preferredClinicIds : []);
  const practitionerIds = objectIds(Array.isArray(preferredPractitionerIds) ? preferredPractitionerIds : []);
  const hasLocationText = Boolean(String(city || "").trim() || String(postalCode || "").trim());
  const latitude = Number(lat);
  const longitude = Number(lng);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const teleOnly = types.length === 1 && types[0] === "tele";

  if (!hasLocationText && !hasCoordinates && clinicIds.length === 0 && practitionerIds.length === 0 && !teleOnly) {
    return res.status(400).json({ error: "Indique une ville, un code postal ou un établissement préféré" });
  }

  const now = new Date();
  const requestedStart = startsAfter ? new Date(startsAfter) : now;
  const requestedExpiry = expiresAt ? new Date(expiresAt) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(requestedStart.getTime()) || Number.isNaN(requestedExpiry.getTime())) {
    return res.status(400).json({ error: "Dates invalides" });
  }
  if (requestedExpiry <= now || requestedExpiry <= requestedStart) {
    return res.status(400).json({ error: "La date d'expiration doit être dans le futur" });
  }
  if (requestedExpiry.getTime() - now.getTime() > 31 * 24 * 60 * 60 * 1000) {
    return res.status(400).json({ error: "Une alerte peut rester active au maximum 31 jours" });
  }

  try {
    const pet = await Pet.findOne({ _id: petId, ownerId: req.auth.userId }).lean();
    if (!pet) return res.status(404).json({ error: "Animal introuvable" });

    const payload = {
      ownerId: req.auth.userId,
      petId: pet._id,
      species: pet.species,
      reason: String(reason).trim(),
      consultationTypes: types,
      city: String(city || "").trim(),
      postalCode: String(postalCode || "").trim(),
      maxDistanceKm: Math.min(Math.max(Number(maxDistanceKm || 20), 1), 100),
      preferredClinicIds: clinicIds,
      preferredPractitionerIds: practitionerIds,
      startsAfter: requestedStart,
      expiresAt: requestedExpiry,
      status: "active",
    };

    if (hasCoordinates) {
      payload.location = { type: "Point", coordinates: [longitude, latitude] };
    }

    const request = await WaitlistRequest.create(payload);
    const populated = await WaitlistRequest.findById(request._id)
      .populate("petId", "name species breed subtype")
      .lean();

    return res.status(201).json({ request: populated });
  } catch (error) {
    console.error("waitlist_create_error", error);
    return res.status(500).json({ error: "Impossible de créer l'alerte" });
  }
});

router.post("/:id/cancel", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Alerte invalide" });

  try {
    const request = await WaitlistRequest.findOne({ _id: req.params.id, ownerId: req.auth.userId });
    if (!request) return res.status(404).json({ error: "Alerte introuvable" });
    if (["booked", "expired", "cancelled"].includes(request.status)) {
      return res.status(409).json({ error: "Cette alerte n'est plus active" });
    }

    if (request.activeOfferId) {
      const offer = await WaitlistOffer.findOne({ _id: request.activeOfferId, ownerId: req.auth.userId }).lean();
      if (offer?.status === "offered") await releaseOffer(offer, "cancelled");
    }

    request.status = "cancelled";
    request.activeOfferId = null;
    await request.save();
    return res.json({ request });
  } catch (error) {
    console.error("waitlist_cancel_error", error);
    return res.status(500).json({ error: "Impossible d'annuler l'alerte" });
  }
});

router.get("/offers/active", async (req, res) => {
  try {
    await expireDueOffers();
    const offers = await WaitlistOffer.find({
      ownerId: req.auth.userId,
      status: "offered",
      expiresAt: { $gt: new Date() },
    })
      .populate("requestId", "petId species reason consultationTypes city postalCode status expiresAt")
      .populate({
        path: "slotId",
        populate: [
          { path: "clinicId", select: "name slug address location phone verified" },
          { path: "practitionerId", select: "displayName title specialties verified rating" },
        ],
      })
      .sort({ expiresAt: 1 })
      .lean();

    return res.json({ offers });
  } catch (error) {
    console.error("waitlist_offers_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/offers/:id/decline", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Offre invalide" });

  try {
    const offer = await WaitlistOffer.findOne({
      _id: req.params.id,
      ownerId: req.auth.userId,
      status: "offered",
    }).lean();
    if (!offer) return res.status(404).json({ error: "Offre active introuvable" });

    await releaseOffer(offer, "declined");
    return res.json({ ok: true });
  } catch (error) {
    console.error("waitlist_decline_error", error);
    return res.status(500).json({ error: "Impossible de décliner cette offre" });
  }
});

router.post("/offers/:id/accept", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Offre invalide" });

  const now = new Date();
  const appointmentId = new mongoose.Types.ObjectId();
  let claimedSlot = null;
  let offer = null;

  try {
    await expireDueOffers();
    offer = await WaitlistOffer.findOne({
      _id: req.params.id,
      ownerId: req.auth.userId,
      status: "offered",
      expiresAt: { $gt: now },
    }).lean();
    if (!offer) return res.status(404).json({ error: "Cette offre n'est plus disponible" });

    const request = await WaitlistRequest.findOne({
      _id: offer.requestId,
      ownerId: req.auth.userId,
      status: "offered",
      activeOfferId: offer._id,
    }).lean();
    if (!request) return res.status(409).json({ error: "Cette alerte n'est plus active" });

    const pet = await Pet.findOne({ _id: request.petId, ownerId: req.auth.userId }).lean();
    if (!pet) return res.status(404).json({ error: "Animal introuvable" });

    claimedSlot = await AvailabilitySlot.findOneAndUpdate(
      {
        _id: offer.slotId,
        status: "held",
        waitlistOfferId: offer._id,
        holdExpiresAt: { $gt: now },
        startsAt: { $gt: now },
      },
      {
        $set: {
          status: "booked",
          appointmentId,
          holdExpiresAt: null,
          waitlistOfferId: null,
        },
      },
      { new: true }
    );

    if (!claimedSlot) return res.status(409).json({ error: "Ce créneau n'est plus disponible" });

    await Appointment.create({
      _id: appointmentId,
      ownerId: req.auth.userId,
      petId: request.petId,
      practitionerId: claimedSlot.practitionerId,
      clinicId: claimedSlot.clinicId,
      slotId: claimedSlot._id,
      startsAt: claimedSlot.startsAt,
      endsAt: claimedSlot.endsAt,
      reason: request.reason,
      consultationType: claimedSlot.consultationType,
      status: "confirmed",
      source: "waitlist",
    });

    await WaitlistOffer.updateOne(
      { _id: offer._id, status: "offered" },
      { $set: { status: "accepted", acceptedAppointmentId: appointmentId } }
    );
    await WaitlistRequest.updateOne(
      { _id: request._id, activeOfferId: offer._id },
      {
        $set: {
          status: "booked",
          activeOfferId: null,
          bookedAppointmentId: appointmentId,
        },
      }
    );

    const appointment = await populateAppointment(Appointment.findById(appointmentId)).lean();
    return res.status(201).json({ appointment });
  } catch (error) {
    if (claimedSlot && offer && new Date(offer.expiresAt) > new Date()) {
      await AvailabilitySlot.findOneAndUpdate(
        { _id: claimedSlot._id, appointmentId },
        {
          $set: {
            status: "held",
            appointmentId: null,
            holdExpiresAt: offer.expiresAt,
            waitlistOfferId: offer._id,
          },
        }
      ).catch((rollbackError) => console.error("waitlist_accept_rollback_error", rollbackError));
    }

    console.error("waitlist_accept_error", error);
    return res.status(500).json({ error: "Impossible de réserver ce créneau" });
  }
});

export default router;
