import express from "express";
import mongoose from "mongoose";
import { Pet } from "../models/Pet.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const editableFields = [
  "name",
  "species",
  "breed",
  "subtype",
  "birthDate",
  "sex",
  "weightKg",
  "identificationNumber",
  "allergies",
  "treatments",
  "notes",
];

function pickPetFields(body = {}) {
  return editableFields.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) result[field] = body[field];
    return result;
  }, {});
}

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function sendDatabaseError(res, error) {
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ error: "Données animal invalides" });
  }
  console.error("pets_error", error);
  return res.status(500).json({ error: "Erreur serveur" });
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const pets = await Pet.find({ ownerId: req.auth.userId }).sort({ createdAt: -1 });
    return res.json({ pets });
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = pickPetFields(req.body);
    if (!payload.name || !payload.species) {
      return res.status(400).json({ error: "Nom et espèce requis" });
    }

    const pet = await Pet.create({ ...payload, ownerId: req.auth.userId });
    return res.status(201).json({ pet });
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.get("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Identifiant animal invalide" });

  try {
    const pet = await Pet.findOne({ _id: req.params.id, ownerId: req.auth.userId });
    if (!pet) return res.status(404).json({ error: "Animal introuvable" });
    return res.json({ pet });
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.patch("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Identifiant animal invalide" });

  const payload = pickPetFields(req.body);
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: "Aucune donnée modifiable fournie" });
  }

  try {
    const pet = await Pet.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.auth.userId },
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!pet) return res.status(404).json({ error: "Animal introuvable" });
    return res.json({ pet });
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

router.delete("/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: "Identifiant animal invalide" });

  try {
    const pet = await Pet.findOneAndDelete({ _id: req.params.id, ownerId: req.auth.userId });
    if (!pet) return res.status(404).json({ error: "Animal introuvable" });
    return res.status(204).end();
  } catch (error) {
    return sendDatabaseError(res, error);
  }
});

export default router;
