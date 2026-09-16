import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import homeIllustration from "../images/Card_home.png";

const speciesOptions = [
  { value: "all", label: "Tous les animaux" },
  { value: "dog", label: "Chien" },
  { value: "cat", label: "Chat" },
  { value: "rabbit", label: "Lapin" },
  { value: "bird", label: "Oiseau" },
  { value: "reptile", label: "Reptile" },
  { value: "rodent", label: "Rongeur" },
  { value: "ferret", label: "Furet" },
  { value: "nac", label: "Tous les NAC" },
  { value: "equine", label: "Équidé" },
  { value: "farm", label: "Animal de ferme" },
];

const reasonOptions = [
  { value: "consult", label: "Consultation" },
  { value: "vaccine", label: "Vaccin" },
  { value: "surgery", label: "Chirurgie" },
  { value: "imaging", label: "Imagerie / Radio" },
  { value: "urgent", label: "Urgence" },
];

export default function Home() {
  const nav = useNavigate();
  const [species, setSpecies] = useState("all");
  const [reason, setReason] = useState("consult");
  const [city, setCity] = useState("Paris");

  const go = () => {
    const q = new URLSearchParams({ species, reason, city: city.trim() || "Paris" });
    nav(`/search?${q.toString()}`);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-20 py-10 lg:py-12">
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-6">
          <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
            Trouve le bon vétérinaire et le bon créneau pour ton animal.
          </h1>
          <p className="mt-4 text-muted text-base lg:text-lg">
            Chiens, chats, lapins, oiseaux, reptiles, rongeurs, furets, animaux de ferme et équidés.
          </p>

          <Card className="mt-8 p-6">
            <div className="text-sm font-semibold mb-4">Rechercher un rendez-vous</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select label="Animal" value={species} onChange={(e) => setSpecies(e.target.value)}>
                {speciesOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>

              <Select label="Motif" value={reason} onChange={(e) => setReason(e.target.value)}>
                {reasonOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>

              <Input
                label="Ville / Code postal"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris, 75011…"
              />

              <div className="flex items-end">
                <Button className="w-full h-12" onClick={go}>Rechercher</Button>
              </div>
            </div>
          </Card>

          <div className="mt-8">
            <div className="text-lg font-semibold">Accès rapide</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { t: "Urgence", q: "urgent=1&reason=urgent" },
                { t: "Téléconsultation", q: "type=tele" },
                { t: "Visite à domicile", q: "type=home" },
                { t: "NAC & reptiles", q: "species=nac" },
                { t: "Animaux de ferme", q: "species=farm&type=farm" },
                { t: "Équidés", q: "species=equine&type=home" },
              ].map((c) => (
                <button
                  key={c.t}
                  onClick={() => nav(`/search?${c.q}&city=${encodeURIComponent(city.trim() || "Paris")}`)}
                  className="h-20 rounded-xl2 bg-white border border-border shadow-soft px-4 text-left hover:bg-black/2 transition"
                  type="button"
                >
                  <div className="font-semibold">{c.t}</div>
                  <div className="text-sm text-muted mt-1">Trouver un créneau</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <Card className="p-8 rounded-[24px]">
            <img
              src={homeIllustration}
              alt="Illustration PetLib"
              className="rounded-[24px] bg-black/5 border border-border block w-full h-auto"
            />
            <div className="mt-4 text-sm text-muted">
              PetLib réunit recherche, disponibilités et réservation pour différents types d'animaux et de consultations.
              <span className="font-semibold text-text"> Le matching tient compte du besoin réel de l'animal.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
