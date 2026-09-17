import express from "express";
import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Clinic } from "../models/Clinic.js";
import { ClinicMembership } from "../models/ClinicMembership.js";
import { Practitioner } from "../models/Practitioner.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();
const speciesValues = new Set(["dog", "cat", "rabbit", "bird", "reptile", "rodent", "ferret", "equine", "farm", "other"]);
const consultationTypeValues = new Set(["clinic", "tele", "home", "farm"]);

router.use(requireAuth, requireRole("practitioner", "clinic_admin", "admin"));

function text(value, max = 500) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function stringList(values, maxItems = 20, maxLength = 80) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => text(value, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function enumList(values, allowed) {
  return stringList(values).filter((value) => allowed.has(value));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function uniqueClinicSlug(name) {
  const base = slugify(name) || "clinique";
  let candidate = base;
  let suffix = 2;
  while (await Clinic.exists({ slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function getContext(req) {
  const practitioner = await Practitioner.findOne({ userId: req.auth.userId });
  const memberships = await ClinicMembership.find({ userId: req.auth.userId, status: "active" })
    .populate("clinicId", "name slug address verified active")
    .lean();

  const membershipClinicIds = memberships
    .map((membership) => membership.clinicId?._id)
    .filter(Boolean);

  return {
    role: req.auth.role,
    practitioner,
    memberships,
    membershipClinicIds,
  };
}

function scopedFilter(ctx, field = "practitionerId") {
  if (ctx.role === "admin") return {};
  if (ctx.role === "practitioner") {
    if (!ctx.practitioner) return { _id: null };
    return { [field]: ctx.practitioner._id };
  }
  if (!ctx.membershipClinicIds.length) return { _id: null };
  return { clinicId: { $in: ctx.membershipClinicIds } };
}

function parseDate(value, fallback) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

router.get("/me", async (req, res) => {
  try {
    const ctx = await getContext(req);
    const practitioner = ctx.practitioner
      ? await Practitioner.findById(ctx.practitioner._id)
          .populate("clinicIds", "name slug address verified active")
          .lean()
      : null;

    return res.json({
      role: ctx.role,
      practitioner,
      memberships: ctx.memberships,
      onboardingComplete: ctx.role !== "practitioner" || Boolean(practitioner),
    });
  } catch (error) {
    console.error("pro_me_error", error);
    return res.status(500).json({ error: "Impossible de charger l’espace professionnel" });
  }
});

router.post("/profile", requireRole("practitioner", "admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const existing = await Practitioner.findOne({ userId: req.auth.userId });
    const displayName = text(body.displayName, 120) || existing?.displayName || "";
    if (!displayName) return res.status(400).json({ error: "Nom d’affichage requis" });

    const update = {
      displayName,
      title: text(body.title, 120) || "Vétérinaire",
      bio: text(body.bio, 2000),
      specialties: stringList(body.specialties, 20, 100),
      acceptedSpecies: enumList(body.acceptedSpecies, speciesValues),
      consultationTypes: enumList(body.consultationTypes, consultationTypeValues),
      languages: stringList(body.languages, 12, 50),
    };

    const practitioner = await Practitioner.findOneAndUpdate(
      { userId: req.auth.userId },
      { $set: update, $setOnInsert: { userId: req.auth.userId, verified: false, active: true } },
      { new: true, upsert: true, runValidators: true }
    )
      .populate("clinicIds", "name slug address verified active")
      .lean();

    return res.status(existing ? 200 : 201).json({ practitioner });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Un profil professionnel existe déjà pour ce compte" });
    console.error("pro_profile_upsert_error", error);
    return res.status(500).json({ error: "Impossible d’enregistrer le profil professionnel" });
  }
});

router.post("/clinics", async (req, res) => {
  try {
    const ctx = await getContext(req);
    if (ctx.role === "practitioner" && !ctx.practitioner) {
      return res.status(409).json({ error: "Crée d’abord ton profil praticien" });
    }

    const body = req.body || {};
    const name = text(body.name, 160);
    if (!name) return res.status(400).json({ error: "Nom de la structure requis" });

    const clinic = await Clinic.create({
      name,
      slug: await uniqueClinicSlug(name),
      description: text(body.description, 2000),
      address: {
        line1: text(body.address?.line1, 160),
        line2: text(body.address?.line2, 160),
        postalCode: text(body.address?.postalCode, 20),
        city: text(body.address?.city, 100),
        country: text(body.address?.country, 80) || "France",
      },
      phone: text(body.phone, 40),
      email: text(body.email, 160).toLowerCase(),
      website: text(body.website, 250),
      acceptedSpecies: enumList(body.acceptedSpecies, speciesValues),
      consultationTypes: enumList(body.consultationTypes, consultationTypeValues),
      services: stringList(body.services, 30, 120),
      verified: false,
      active: true,
    });

    await ClinicMembership.create({
      userId: req.auth.userId,
      clinicId: clinic._id,
      practitionerId: ctx.practitioner?._id || null,
      role: "clinic_admin",
      status: "active",
    });

    if (ctx.practitioner) {
      await Practitioner.updateOne(
        { _id: ctx.practitioner._id },
        { $addToSet: { clinicIds: clinic._id } }
      );
    }

    return res.status(201).json({ clinic });
  } catch (error) {
    console.error("pro_clinic_create_error", error);
    return res.status(500).json({ error: "Impossible de créer la structure" });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const ctx = await getContext(req);
    if (ctx.role === "practitioner" && !ctx.practitioner) {
      return res.status(409).json({ error: "Profil praticien requis", code: "PRO_PROFILE_REQUIRED" });
    }

    const now = new Date();
    const from = parseDate(req.query.from, new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const to = parseDate(req.query.to, new Date(from.getTime() + 24 * 60 * 60 * 1000));
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const appointmentScope = scopedFilter(ctx, "practitionerId");
    const slotScope = scopedFilter(ctx, "practitionerId");

    const activeStatuses = { $in: ["pending", "confirmed"] };
    const [todayAppointments, upcomingAppointments, availableSlots, waitlistRecovered, nextAppointments] = await Promise.all([
      Appointment.countDocuments({ ...appointmentScope, startsAt: { $gte: from, $lt: to }, status: activeStatuses }),
      Appointment.countDocuments({ ...appointmentScope, startsAt: { $gte: now, $lt: in30Days }, status: activeStatuses }),
      AvailabilitySlot.countDocuments({ ...slotScope, startsAt: { $gte: now, $lt: in30Days }, status: "available" }),
      Appointment.countDocuments({
        ...appointmentScope,
        createdAt: { $gte: thirtyDaysAgo },
        source: "waitlist",
        status: { $ne: "cancelled" },
      }),
      Appointment.find({ ...appointmentScope, startsAt: { $gte: now }, status: activeStatuses })
        .populate("petId", "name species breed subtype")
        .populate("clinicId", "name slug address")
        .populate("practitionerId", "displayName title")
        .sort({ startsAt: 1 })
        .limit(5)
        .lean(),
    ]);

    return res.json({
      practitioner: ctx.practitioner
        ? {
            id: ctx.practitioner._id,
            displayName: ctx.practitioner.displayName,
            title: ctx.practitioner.title,
            verified: ctx.practitioner.verified,
          }
        : null,
      metrics: { todayAppointments, upcomingAppointments, availableSlots, waitlistRecovered },
      nextAppointments,
      period: { from, to },
    });
  } catch (error) {
    console.error("pro_dashboard_error", error);
    return res.status(500).json({ error: "Impossible de charger le tableau de bord" });
  }
});

router.get("/appointments", async (req, res) => {
  try {
    const ctx = await getContext(req);
    const filter = { ...scopedFilter(ctx, "practitionerId") };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.from || req.query.to) {
      filter.startsAt = {};
      if (req.query.from) filter.startsAt.$gte = parseDate(req.query.from, new Date(0));
      if (req.query.to) filter.startsAt.$lt = parseDate(req.query.to, new Date("2999-01-01"));
    }

    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 250);
    const appointments = await Appointment.find(filter)
      .populate("petId", "name species breed subtype")
      .populate("clinicId", "name slug address")
      .populate("practitionerId", "displayName title")
      .populate("slotId", "startsAt endsAt consultationType status")
      .sort({ startsAt: 1 })
      .limit(limit)
      .lean();

    return res.json({ appointments });
  } catch (error) {
    console.error("pro_appointments_error", error);
    return res.status(500).json({ error: "Impossible de charger les rendez-vous" });
  }
});

router.get("/availability", async (req, res) => {
  try {
    const ctx = await getContext(req);
    const filter = { ...scopedFilter(ctx, "practitionerId") };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.from || req.query.to) {
      filter.startsAt = {};
      if (req.query.from) filter.startsAt.$gte = parseDate(req.query.from, new Date(0));
      if (req.query.to) filter.startsAt.$lt = parseDate(req.query.to, new Date("2999-01-01"));
    }

    const slots = await AvailabilitySlot.find(filter)
      .populate("clinicId", "name slug address")
      .populate("practitionerId", "displayName title")
      .sort({ startsAt: 1 })
      .limit(500)
      .lean();

    return res.json({ slots });
  } catch (error) {
    console.error("pro_availability_error", error);
    return res.status(500).json({ error: "Impossible de charger les disponibilités" });
  }
});

export default router;
