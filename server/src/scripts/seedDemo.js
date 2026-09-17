import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../db.js";
import { User } from "../models/User.js";
import { Pet } from "../models/Pet.js";
import { Clinic } from "../models/Clinic.js";
import { ClinicMembership } from "../models/ClinicMembership.js";
import { Practitioner } from "../models/Practitioner.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Appointment } from "../models/Appointment.js";
import { WaitlistRequest } from "../models/WaitlistRequest.js";
import { WaitlistOffer } from "../models/WaitlistOffer.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Demo seed is disabled in production");
}

await connectDB(process.env.MONGO_URI);

const demoEmails = [
  "demo.clinique@petlib.local",
  "demo.veto@petlib.local",
  "demo.veto2@petlib.local",
  "demo.proprietaire@petlib.local",
];
const demoPassword = process.env.DEMO_PASSWORD || "PetLibDemo2026!";

const previousUsers = await User.find({ email: { $in: demoEmails } }).select("_id").lean();
const previousUserIds = previousUsers.map((user) => user._id);
const previousClinics = await Clinic.find({ slug: /^demo-/ }).select("_id").lean();
const previousClinicIds = previousClinics.map((clinic) => clinic._id);

if (previousUserIds.length) {
  const previousRequests = await WaitlistRequest.find({ ownerId: { $in: previousUserIds } }).select("_id").lean();
  const previousRequestIds = previousRequests.map((request) => request._id);
  if (previousRequestIds.length) await WaitlistOffer.deleteMany({ requestId: { $in: previousRequestIds } });
  await WaitlistRequest.deleteMany({ ownerId: { $in: previousUserIds } });
  await Pet.deleteMany({ ownerId: { $in: previousUserIds } });
  await ClinicMembership.deleteMany({ userId: { $in: previousUserIds } });
}

if (previousClinicIds.length) {
  await Appointment.deleteMany({ clinicId: { $in: previousClinicIds } });
  await AvailabilitySlot.deleteMany({ clinicId: { $in: previousClinicIds } });
  await ClinicMembership.deleteMany({ clinicId: { $in: previousClinicIds } });
  await Practitioner.deleteMany({ clinicIds: { $in: previousClinicIds } });
  await Clinic.deleteMany({ _id: { $in: previousClinicIds } });
}

if (previousUserIds.length) {
  await Practitioner.updateMany({ userId: { $in: previousUserIds } }, { $unset: { userId: 1 } });
  await User.deleteMany({ _id: { $in: previousUserIds } });
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

const passwordHash = await bcrypt.hash(demoPassword, 12);
const [clinicAdminUser, vetUser, vet2User, ownerUser] = await User.create([
  {
    email: "demo.clinique@petlib.local",
    passwordHash,
    fullName: "Admin Clinique Démo",
    role: "clinic_admin",
  },
  {
    email: "demo.veto@petlib.local",
    passwordHash,
    fullName: "Dr Camille Démo",
    role: "practitioner",
  },
  {
    email: "demo.veto2@petlib.local",
    passwordHash,
    fullName: "Dr Samir Démo",
    role: "practitioner",
  },
  {
    email: "demo.proprietaire@petlib.local",
    passwordHash,
    fullName: "Propriétaire Démo",
    role: "owner",
  },
]);

const [nacVet, generalVet, secondGeneralVet, ruralVet] = await Practitioner.create([
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
    userId: vetUser._id,
    clinicIds: [generalClinic._id],
    displayName: "Dr Camille Démo",
    title: "Vétérinaire généraliste",
    bio: "Profil fictif connecté au compte praticien de démonstration.",
    specialties: ["Médecine générale", "Imagerie", "Prévention"],
    acceptedSpecies: ["dog", "cat", "rabbit"],
    consultationTypes: ["clinic", "tele", "home"],
    languages: ["Français"],
    pricing: [{ label: "Consultation", amountCents: 4500, consultationType: "clinic", currency: "EUR" }],
    verified: true,
    active: true,
    rating: 4.7,
    reviewsCount: 208,
  },
  {
    userId: vet2User._id,
    clinicIds: [generalClinic._id],
    displayName: "Dr Samir Démo",
    title: "Vétérinaire chirurgie & prévention",
    bio: "Second praticien fictif pour tester le fonctionnement multi-vétérinaires.",
    specialties: ["Chirurgie", "Prévention"],
    acceptedSpecies: ["dog", "cat"],
    consultationTypes: ["clinic", "tele"],
    languages: ["Français", "Anglais"],
    pricing: [{ label: "Consultation", amountCents: 4800, consultationType: "clinic", currency: "EUR" }],
    verified: true,
    active: true,
    rating: 4.9,
    reviewsCount: 87,
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

await ClinicMembership.create([
  {
    userId: clinicAdminUser._id,
    clinicId: generalClinic._id,
    role: "clinic_admin",
    status: "active",
  },
  {
    userId: vetUser._id,
    clinicId: generalClinic._id,
    practitionerId: generalVet._id,
    role: "practitioner",
    status: "active",
  },
  {
    userId: vet2User._id,
    clinicId: generalClinic._id,
    practitionerId: secondGeneralVet._id,
    role: "practitioner",
    status: "active",
  },
]);

const ownerPet = await Pet.create({
  ownerId: ownerUser._id,
  name: "Moka",
  species: "dog",
  breed: "Labrador",
  sex: "female",
  weightKg: 24,
  allergies: "Aucune connue",
  notes: "Animal fictif réservé aux tests PetLib.",
});

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
    practitioner: secondGeneralVet,
    clinic: generalClinic,
    type: "clinic",
    species: ["dog", "cat"],
    reasons: ["consult", "vaccine", "surgery", "urgent"],
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

async function createBookedDemoAppointment({ practitioner, startsAt, status, reason, source = "direct" }) {
  const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
  const slot = await AvailabilitySlot.create({
    practitionerId: practitioner._id,
    clinicId: generalClinic._id,
    startsAt,
    endsAt,
    consultationType: "clinic",
    acceptedSpecies: ["dog"],
    allowedReasons: [reason],
    status: "booked",
  });

  const appointment = await Appointment.create({
    ownerId: ownerUser._id,
    petId: ownerPet._id,
    practitionerId: practitioner._id,
    clinicId: generalClinic._id,
    slotId: slot._id,
    startsAt,
    endsAt,
    reason,
    consultationType: "clinic",
    status,
    source,
    ownerNotes: "Rendez-vous fictif créé pour tester l’espace professionnel.",
  });

  await AvailabilitySlot.updateOne({ _id: slot._id }, { $set: { appointmentId: appointment._id } });
  return appointment;
}

const pastStart = new Date(Date.now() - 45 * 60 * 1000);
pastStart.setSeconds(0, 0);
await createBookedDemoAppointment({
  practitioner: generalVet,
  startsAt: pastStart,
  status: "confirmed",
  reason: "consult",
});

await createBookedDemoAppointment({
  practitioner: generalVet,
  startsAt: slotDate(1, 10, 0),
  status: "pending",
  reason: "vaccine",
});

await createBookedDemoAppointment({
  practitioner: secondGeneralVet,
  startsAt: slotDate(1, 12, 0),
  status: "confirmed",
  reason: "consult",
  source: "waitlist",
});

console.log(`Demo seed complete: ${3} clinics, ${4} practitioners, ${slotDefinitions.length} free slots, 3 booked appointments`);
console.log("\n=== PetLib demo accounts (local development only) ===");
console.log(`Clinic admin : demo.clinique@petlib.local / ${demoPassword}`);
console.log(`Veterinarian 1: demo.veto@petlib.local / ${demoPassword}`);
console.log(`Veterinarian 2: demo.veto2@petlib.local / ${demoPassword}`);
console.log(`Owner        : demo.proprietaire@petlib.local / ${demoPassword}`);
console.log("=====================================================\n");

await mongoose.disconnect();
