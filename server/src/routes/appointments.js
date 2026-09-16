import express from "express";
import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Pet } from "../models/Pet.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function validId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function canUseSlot(slot, pet, reason) {
  if (slot.acceptedSpecies?.length && !slot.acceptedSpecies.includes(pet.species)) return false;
  if (slot.allowedReasons?.length && !slot.allowedReasons.includes(reason)) return false;
  return true;
}

function populateAppointment(query) {
  return query
    .populate("petId", "name species breed subtype birthDate sex weightKg identificationNumber")
    .populate("practitionerId", "displayName title specialties acceptedSpecies consultationTypes verified rating reviewsCount")
    .populate("clinicId", "name slug address location phone email consultationTypes emergencyCapability verified")
    .populate("slotId", "startsAt endsAt consultationType status");
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const filter = { ownerId: req.auth.userId };
    if (req.query.status) filter.status = req.query.status;

    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return res.status(400).json({ error: "Période invalide" });
    }
    if (from || to) {
      filter.startsAt = {};
      if (from) filter.startsAt.$gte = from;
      if (to) filter.startsAt.$lte = to;
    }

    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const appointments = await populateAppointment(
      Appointment.find(filter).sort({ startsAt: 1 }).limit(limit)
    ).lean();

    return res.json({ appointments });
  } catch (error) {
    console.error("appointments_list_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", async (req, res) => {
  const { petId, slotId, reason, ownerNotes } = req.body || {};

  if (!validId(petId) || !validId(slotId)) {
    return res.status(400).json({ error: "Animal ou créneau invalide" });
  }
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: "Motif requis" });
  }

  const appointmentId = new mongoose.Types.ObjectId();
  let claimedSlot = null;

  try {
    const pet = await Pet.findOne({ _id: petId, ownerId: req.auth.userId }).lean();
    if (!pet) return res.status(404).json({ error: "Animal introuvable" });

    const slot = await AvailabilitySlot.findById(slotId).lean();
    if (!slot) return res.status(404).json({ error: "Créneau introuvable" });
    if (slot.startsAt <= new Date()) return res.status(409).json({ error: "Ce créneau n'est plus réservable" });
    if (!canUseSlot(slot, pet, String(reason))) {
      return res.status(409).json({ error: "Ce créneau n'est pas compatible avec cet animal ou ce motif" });
    }

    claimedSlot = await AvailabilitySlot.findOneAndUpdate(
      { _id: slotId, status: "available", startsAt: { $gt: new Date() } },
      {
        $set: {
          status: "booked",
          appointmentId,
          holdExpiresAt: null,
        },
      },
      { new: true }
    );

    if (!claimedSlot) {
      return res.status(409).json({ error: "Ce créneau vient d'être réservé" });
    }

    await Appointment.create({
      _id: appointmentId,
      ownerId: req.auth.userId,
      petId,
      practitionerId: claimedSlot.practitionerId,
      clinicId: claimedSlot.clinicId,
      slotId: claimedSlot._id,
      startsAt: claimedSlot.startsAt,
      endsAt: claimedSlot.endsAt,
      reason: String(reason).trim(),
      consultationType: claimedSlot.consultationType,
      status: "confirmed",
      source: "direct",
      ownerNotes: ownerNotes ? String(ownerNotes).trim() : "",
    });

    const appointment = await populateAppointment(Appointment.findById(appointmentId)).lean();
    return res.status(201).json({ appointment });
  } catch (error) {
    if (claimedSlot) {
      await AvailabilitySlot.findOneAndUpdate(
        { _id: claimedSlot._id, appointmentId },
        { $set: { status: "available", appointmentId: null, holdExpiresAt: null } }
      ).catch((rollbackError) => console.error("booking_rollback_error", rollbackError));
    }

    console.error("appointment_create_error", error);
    return res.status(500).json({ error: "Impossible de finaliser la réservation" });
  }
});

router.get("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Identifiant rendez-vous invalide" });

  try {
    const appointment = await populateAppointment(
      Appointment.findOne({ _id: req.params.id, ownerId: req.auth.userId })
    ).lean();

    if (!appointment) return res.status(404).json({ error: "Rendez-vous introuvable" });
    return res.json({ appointment });
  } catch (error) {
    console.error("appointment_get_error", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/:id/cancel", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Identifiant rendez-vous invalide" });

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.auth.userId,
        status: { $in: ["pending", "confirmed"] },
      },
      {
        $set: {
          status: "cancelled",
          "cancellation.at": new Date(),
          "cancellation.by": "owner",
          "cancellation.reason": req.body?.reason ? String(req.body.reason).trim() : "",
        },
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ error: "Rendez-vous actif introuvable" });
    }

    if (appointment.startsAt > new Date()) {
      await AvailabilitySlot.findOneAndUpdate(
        {
          _id: appointment.slotId,
          appointmentId: appointment._id,
          status: "booked",
        },
        {
          $set: {
            status: "available",
            appointmentId: null,
            holdExpiresAt: null,
          },
        }
      );
    }

    const populated = await populateAppointment(Appointment.findById(appointment._id)).lean();
    return res.json({ appointment: populated });
  } catch (error) {
    console.error("appointment_cancel_error", error);
    return res.status(500).json({ error: "Impossible d'annuler le rendez-vous" });
  }
});

export default router;
