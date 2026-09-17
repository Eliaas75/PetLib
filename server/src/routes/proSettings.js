import express from "express";
import mongoose from "mongoose";
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

function stringList(values, maxItems = 30, maxLength = 100) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => text(value, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function enumList(values, allowed) {
  return stringList(values).filter((value) => allowed.has(value));
}

function sanitizePricing(values) {
  if (!Array.isArray(values)) return [];
  return values
    .slice(0, 20)
    .map((item) => ({
      label: text(item?.label, 100),
      amountCents: Math.max(0, Math.round(Number(item?.amountCents || 0))),
      consultationType: consultationTypeValues.has(item?.consultationType) ? item.consultationType : "clinic",
      currency: "EUR",
    }))
    .filter((item) => item.label && Number.isFinite(item.amountCents));
}

async function loadContext(req) {
  const practitioner = await Practitioner.findOne({ userId: req.auth.userId });
  const memberships = await ClinicMembership.find({ userId: req.auth.userId, status: "active" }).lean();
  return { role: req.auth.role, practitioner, memberships };
}

async function canManageClinic(req, clinicId, ctx) {
  if (ctx.role === "admin") return true;
  if (ctx.role === "practitioner") {
    return Boolean(ctx.practitioner?.clinicIds?.some((id) => String(id) === String(clinicId)));
  }
  return ctx.memberships.some((membership) => String(membership.clinicId) === String(clinicId));
}

router.get("/", async (req, res) => {
  try {
    const ctx = await loadContext(req);
    const practitioner = ctx.practitioner
      ? await Practitioner.findById(ctx.practitioner._id)
          .populate("clinicIds", "name slug description address phone email website acceptedSpecies consultationTypes equipment services openingHours emergencyCapability homeVisitRadiusKm verified active rating reviewsCount")
          .lean()
      : null;

    const membershipClinicIds = ctx.memberships.map((membership) => membership.clinicId);
    const membershipClinics = membershipClinicIds.length
      ? await Clinic.find({ _id: { $in: membershipClinicIds } })
          .select("name slug description address phone email website acceptedSpecies consultationTypes equipment services openingHours emergencyCapability homeVisitRadiusKm verified active rating reviewsCount")
          .lean()
      : [];

    return res.json({ role: ctx.role, practitioner, membershipClinics });
  } catch (error) {
    console.error("pro_settings_get_error", error);
    return res.status(500).json({ error: "Impossible de charger les paramètres professionnels" });
  }
});

router.patch("/practitioner", requireRole("practitioner", "admin"), async (req, res) => {
  try {
    const practitioner = await Practitioner.findOne({ userId: req.auth.userId });
    if (!practitioner) return res.status(404).json({ error: "Profil praticien introuvable" });

    const body = req.body || {};
    const displayName = text(body.displayName, 120);
    if (!displayName) return res.status(400).json({ error: "Nom d’affichage requis" });

    practitioner.displayName = displayName;
    practitioner.title = text(body.title, 120) || "Vétérinaire";
    practitioner.bio = text(body.bio, 3000);
    practitioner.specialties = stringList(body.specialties, 20, 100);
    practitioner.languages = stringList(body.languages, 12, 50);
    practitioner.acceptedSpecies = enumList(body.acceptedSpecies, speciesValues);
    practitioner.consultationTypes = enumList(body.consultationTypes, consultationTypeValues);
    practitioner.pricing = sanitizePricing(body.pricing);
    await practitioner.save();

    return res.json({ practitioner: practitioner.toObject() });
  } catch (error) {
    console.error("pro_settings_practitioner_patch_error", error);
    return res.status(500).json({ error: "Impossible d’enregistrer le profil praticien" });
  }
});

router.patch("/clinics/:id", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Structure invalide" });

  try {
    const ctx = await loadContext(req);
    if (!(await canManageClinic(req, req.params.id, ctx))) return res.status(403).json({ error: "Accès refusé à cette structure" });

    const body = req.body || {};
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ error: "Structure introuvable" });

    if (body.name !== undefined) clinic.name = text(body.name, 160) || clinic.name;
    if (body.description !== undefined) clinic.description = text(body.description, 3000);
    if (body.phone !== undefined) clinic.phone = text(body.phone, 40);
    if (body.email !== undefined) clinic.email = text(body.email, 160).toLowerCase();
    if (body.website !== undefined) clinic.website = text(body.website, 250);
    if (body.acceptedSpecies !== undefined) clinic.acceptedSpecies = enumList(body.acceptedSpecies, speciesValues);
    if (body.consultationTypes !== undefined) clinic.consultationTypes = enumList(body.consultationTypes, consultationTypeValues);
    if (body.equipment !== undefined) clinic.equipment = stringList(body.equipment, 40, 120);
    if (body.services !== undefined) clinic.services = stringList(body.services, 40, 120);
    if (body.emergencyCapability !== undefined) clinic.emergencyCapability = Boolean(body.emergencyCapability);
    if (body.homeVisitRadiusKm !== undefined) clinic.homeVisitRadiusKm = Math.min(Math.max(Number(body.homeVisitRadiusKm || 0), 0), 500);

    if (body.address && typeof body.address === "object") {
      clinic.address = {
        line1: text(body.address.line1, 160),
        line2: text(body.address.line2, 160),
        postalCode: text(body.address.postalCode, 20),
        city: text(body.address.city, 100),
        country: text(body.address.country, 80) || "France",
      };
    }

    await clinic.save();
    return res.json({ clinic: clinic.toObject() });
  } catch (error) {
    console.error("pro_settings_clinic_patch_error", error);
    return res.status(500).json({ error: "Impossible d’enregistrer la structure" });
  }
});

export default router;
