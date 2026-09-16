import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { Clinic } from "../models/Clinic.js";
import { Practitioner } from "../models/Practitioner.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seed is disabled in production");
}

await connectDB(process.env.MONGO_URI);

const previousClinics = await Clinic.find({ slug: /^demo-/ }).select("_id").lean();
const previousClinicIds = previousClinics.map((clinic) => clinic._id);

if (previousClinicIds.length) {
  await AvailabilitySlot.deleteMany({ clinicId: { $in: previousClinicIds } });
  await Practitioner.deleteMany({ clinicIds: { $in: previousClinicIds } });
  await Clinic.deleteMany({ _id: { $in: previousClinicIds } });
}

const [nacClinic, generalClinic, mobileClinic] = await Clinic.create([
  {
    name: "PetLib Démo — Clinique NAC",
    slug: "demo-clinique-nac",
    description: "Établissement fictif réservé aux tests de développement PetLib.",
    address: { line1: "Adresse de démonstration", postalCode: "75011", city: "Paris", country: "France" },
    location: { type: "Point", coordinates: [2.378, 48.857] },
    acceptedSpecies: ["rabbit", "bird", "reptile", "rodent", "ferret"],
    consultationTypes: ["clinic", "tele"],
    equipment: ["Imagerie", "Laboratoire"],
    services: ["Consultation NAC", "Imagerie", "Prévention"],
    emergencyCapability: true,
    verified: true,
    active: true,
    rating: 4.8,
    reviewsCount: 124,
  },
  {
    name: "PetLib Démo — Centre Vétérinaire",
    slug: "demo-centre-veterinaire",
    description: "Établissement fictif réservé aux tests de développement PetLib.",
    address: { line1: "Adresse de démonstration", postalCode: "75012", city: "Paris", country: "France" },
    location: { type: "Point", coordinates: [2.398, 48.842] },
    acceptedSpecies: ["dog", "cat", "rabbit"],
    consultationTypes: ["clinic", "tele", "home"],
    equipment: ["Imagerie", "Chirurgie", "Laboratoire"],
    services: ["Consultation", "Vaccination", "Chirurgie", "Imagerie"],
    emergencyCapability: true,
    homeVisitRadiusKm: 12,
    verified: true,
    active: true,
    rating: 4.7,
    reviewsCount: 208,
  },
  {
    name: "PetLib Démo — Vétérinaire Mobile Rural",
    slug: "demo-mobile-rural",
    description: "Service fictif réservé aux tests de développement PetLib.",
    address: { line1: "Secteur de démonstration", postalCode: "94000", city: "Créteil", country: "France" },
    location: { type: "Point", coordinates: [2.455, 48.79] },
    acceptedSpecies: ["equine", "farm"],
    consultationTypes: ["home", "farm"],
    services: ["Visite élevage", "Vaccination", "Suivi troupeau"],
    homeVisitRadiusKm: 40,
    verified: true,
    active: true,
    rating: 4.9,
    reviewsCount: 42,
  },
]);

const [nacVet, generalVet, ruralVet] = await Practitioner.create([
  {
    clinicIds: [nacClinic._id],
    displayName: "Dr Démo NAC",
    title: "Vétérinaire NAC",
    bio: "Profil fictif pour tester PetLib.",
    specialties: ["NAC", "Reptiles", "Oiseaux"],
    acceptedSpecies: ["rabbit", "bird", "reptile", "rodent", "ferret"],
    consultationTypes: ["clinic", "tele"],
    languages: ["Français", "Anglais"],
    verified: true,
    active: true,
    rating: 4.8,
    reviewsCount: 124,
  },
  {
    clinicIds: [generalClinic._id],
    displayName: "Dr Démo Généraliste",
    title: "Vétérinaire",
    bio: "Profil fictif pour tester PetLib.",
    specialties: ["Médecine générale", "Imagerie", "Prévention"],
    acceptedSpecies: ["dog", "cat", "rabbit"],
    consultationTypes: ["clinic", "tele", "home"],
    languages: ["Français"],
    verified: true,
    active: true,
    rating: 4.7,
    reviewsCount: 208,
  },
  {
    clinicIds: [mobileClinic._id],
    displayName: "Dr Démo Rural",
    title: "Vétérinaire rural",
    bio: "Profil fictif pour tester PetLib.",
    specialties: ["Équidés", "Bovins", "Ovins", "Caprins"],
    acceptedSpecies: ["equine", "farm"],
    consultationTypes: ["home", "farm"],
    languages: ["Français"],
    verified: true,
    active: true,
    rating: 4.9,
    reviewsCount: 42,
  },
]);

function slotDate(daysFromNow, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const slotDefinitions = [];
const practitioners = [
  {
    practitioner: nacVet,
    clinic: nacClinic,
    type: "clinic",
    species: ["rabbit", "bird", "reptile", "rodent", "ferret"],
    reasons: ["consult", "vaccine", "imaging", "urgent"],
  },
  {
    practitioner: generalVet,
    clinic: generalClinic,
    type: "clinic",
    species: ["dog", "cat", "rabbit"],
    reasons: ["consult", "vaccine", "surgery", "imaging", "urgent"],
  },
  {
    practitioner: ruralVet,
    clinic: mobileClinic,
    type: "farm",
    species: ["equine", "farm"],
    reasons: ["consult", "vaccine", "urgent"],
  },
];

for (const entry of practitioners) {
  for (let day = 0; day < 7; day += 1) {
    for (const hour of [9, 11, 14, 16]) {
      const startsAt = slotDate(day, hour, hour === 14 ? 30 : 0);
      if (startsAt <= new Date()) continue;
      slotDefinitions.push({
        practitionerId: entry.practitioner._id,
        clinicId: entry.clinic._id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
        consultationType: entry.type,
        acceptedSpecies: entry.species,
        allowedReasons: entry.reasons,
        status: "available",
      });
    }
  }
}

await AvailabilitySlot.insertMany(slotDefinitions);

console.log(`Demo seed complete: ${3} clinics, ${3} practitioners, ${slotDefinitions.length} slots`);
await mongoose.disconnect();
