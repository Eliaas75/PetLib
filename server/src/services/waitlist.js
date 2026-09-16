import mongoose from "mongoose";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Clinic } from "../models/Clinic.js";
import { WaitlistOffer } from "../models/WaitlistOffer.js";
import { WaitlistRequest } from "../models/WaitlistRequest.js";

const OFFER_TTL_MS = 5 * 60 * 1000;
const START_BUFFER_MS = 60 * 1000;

function sameId(a, b) {
  return String(a) === String(b);
}

function normalize(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR");
}

function haversineKm([lng1, lat1], [lng2, lat2]) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function requestMatchesClinicAndSlot(request, clinic, slot) {
  if (request.consultationTypes?.length && !request.consultationTypes.includes(slot.consultationType)) return false;

  if (request.preferredClinicIds?.length && !request.preferredClinicIds.some((id) => sameId(id, slot.clinicId))) {
    return false;
  }

  if (
    request.preferredPractitionerIds?.length &&
    !request.preferredPractitionerIds.some((id) => sameId(id, slot.practitionerId))
  ) {
    return false;
  }

  if (request.postalCode && normalize(request.postalCode) !== normalize(clinic?.address?.postalCode)) return false;
  if (request.city && normalize(request.city) !== normalize(clinic?.address?.city)) return false;

  const requestCoordinates = request.location?.coordinates;
  const clinicCoordinates = clinic?.location?.coordinates;
  if (
    Array.isArray(requestCoordinates) &&
    requestCoordinates.length === 2 &&
    Array.isArray(clinicCoordinates) &&
    clinicCoordinates.length === 2
  ) {
    if (haversineKm(requestCoordinates, clinicCoordinates) > Number(request.maxDistanceKm || 20)) return false;
  }

  return true;
}

export async function offerSlotToWaitlist(slotId, { excludeRequestIds = [], skipCleanup = false } = {}) {
  if (!skipCleanup) await expireDueOffers({ rematch: false });

  const now = new Date();
  const slot = await AvailabilitySlot.findOne({
    _id: slotId,
    status: "available",
    startsAt: { $gt: now },
  }).lean();

  if (!slot) return null;

  const clinic = await Clinic.findById(slot.clinicId).lean();
  if (!clinic) return null;

  const query = {
    status: "active",
    startsAfter: { $lte: slot.startsAt },
    expiresAt: { $gt: now },
  };

  if (slot.acceptedSpecies?.length) query.species = { $in: slot.acceptedSpecies };
  if (slot.allowedReasons?.length) query.reason = { $in: slot.allowedReasons };
  if (excludeRequestIds.length) {
    query._id = {
      $nin: excludeRequestIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  const candidates = await WaitlistRequest.find(query).sort({ createdAt: 1 }).limit(100).lean();

  for (const request of candidates) {
    if (!requestMatchesClinicAndSlot(request, clinic, slot)) continue;

    const expiresAt = new Date(
      Math.min(
        now.getTime() + OFFER_TTL_MS,
        new Date(request.expiresAt).getTime(),
        new Date(slot.startsAt).getTime() - START_BUFFER_MS
      )
    );

    if (expiresAt <= now) continue;

    const offerId = new mongoose.Types.ObjectId();
    const heldSlot = await AvailabilitySlot.findOneAndUpdate(
      { _id: slot._id, status: "available", startsAt: { $gt: now } },
      {
        $set: {
          status: "held",
          holdExpiresAt: expiresAt,
          waitlistOfferId: offerId,
          appointmentId: null,
        },
      },
      { new: true }
    );

    if (!heldSlot) return null;

    let offer = null;
    try {
      offer = await WaitlistOffer.create({
        _id: offerId,
        requestId: request._id,
        ownerId: request.ownerId,
        slotId: slot._id,
        expiresAt,
        status: "offered",
      });

      const claimedRequest = await WaitlistRequest.findOneAndUpdate(
        { _id: request._id, status: "active" },
        { $set: { status: "offered", activeOfferId: offerId } },
        { new: true }
      );

      if (!claimedRequest) {
        await WaitlistOffer.updateOne({ _id: offerId }, { $set: { status: "cancelled" } });
        await AvailabilitySlot.updateOne(
          { _id: slot._id, status: "held", waitlistOfferId: offerId },
          { $set: { status: "available", holdExpiresAt: null, waitlistOfferId: null } }
        );
        continue;
      }

      return offer;
    } catch (error) {
      if (offer) {
        await WaitlistOffer.updateOne({ _id: offer._id }, { $set: { status: "cancelled" } }).catch(() => {});
      }
      await AvailabilitySlot.updateOne(
        { _id: slot._id, status: "held", waitlistOfferId: offerId },
        { $set: { status: "available", holdExpiresAt: null, waitlistOfferId: null } }
      ).catch(() => {});
      throw error;
    }
  }

  return null;
}

export async function releaseOffer(offerOrId, status, { rematch = true } = {}) {
  const offer = typeof offerOrId === "object" ? offerOrId : await WaitlistOffer.findById(offerOrId).lean();
  if (!offer || offer.status !== "offered") return false;

  const changed = await WaitlistOffer.findOneAndUpdate(
    { _id: offer._id, status: "offered" },
    { $set: { status } },
    { new: true }
  );
  if (!changed) return false;

  const request = await WaitlistRequest.findById(offer.requestId).lean();
  if (request && sameId(request.activeOfferId, offer._id)) {
    const nextStatus = new Date(request.expiresAt) <= new Date() ? "expired" : "active";
    await WaitlistRequest.updateOne(
      { _id: request._id, activeOfferId: offer._id },
      { $set: { status: nextStatus, activeOfferId: null } }
    );
  }

  const releasedSlot = await AvailabilitySlot.findOneAndUpdate(
    { _id: offer.slotId, status: "held", waitlistOfferId: offer._id },
    { $set: { status: "available", holdExpiresAt: null, waitlistOfferId: null } },
    { new: true }
  );

  if (rematch && releasedSlot && releasedSlot.startsAt > new Date()) {
    await offerSlotToWaitlist(releasedSlot._id, {
      excludeRequestIds: [offer.requestId],
      skipCleanup: true,
    });
  }

  return true;
}

export async function expireDueOffers({ rematch = true } = {}) {
  const now = new Date();

  await WaitlistRequest.updateMany(
    { status: "active", expiresAt: { $lte: now } },
    { $set: { status: "expired" } }
  );

  const expiredOffers = await WaitlistOffer.find({
    status: "offered",
    expiresAt: { $lte: now },
  })
    .sort({ expiresAt: 1 })
    .limit(100)
    .lean();

  for (const offer of expiredOffers) {
    await releaseOffer(offer, "expired", { rematch });
  }

  return expiredOffers.length;
}

let sweeper = null;

export function startWaitlistSweeper(intervalMs = 60_000) {
  if (sweeper) return sweeper;
  sweeper = setInterval(() => {
    expireDueOffers().catch((error) => console.error("waitlist_sweeper_error", error));
  }, intervalMs);
  sweeper.unref?.();
  return sweeper;
}
