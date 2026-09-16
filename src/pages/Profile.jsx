import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import Tag from "../components/Tag.jsx";
import Button from "../components/Button.jsx";
import Select from "../components/Select.jsx";
import Chip from "../components/Chip.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const tabList = ["Infos", "Services", "Avis", "Accès"];
const reasonOptions = [
  ["consult", "Consultation"],
  ["vaccine", "Vaccination"],
  ["surgery", "Chirurgie"],
  ["imaging", "Imagerie / Radio"],
  ["urgent", "Urgence"],
];
const consultationLabels = {
  clinic: "Clinique",
  tele: "Téléconsultation",
  home: "À domicile",
  farm: "À la ferme",
};

function formatDay(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Profile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const autoBook = params.get("book") === "1";
  const nav = useNavigate();
  const { user } = useAuth();

  const [practitioner, setPractitioner] = useState(null);
  const [slots, setSlots] = useState([]);
  const [pets, setPets] = useState([]);
  const [tab, setTab] = useState("Infos");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [reason, setReason] = useState("consult");
  const [consultationType, setConsultationType] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicData() {
      setLoading(true);
      setError("");
      try {
        const [practitionerData, availabilityData] = await Promise.all([
          api(`/api/practitioners/${id}`),
          api(`/api/availability?practitionerId=${encodeURIComponent(id)}&limit=100`),
        ]);
        if (cancelled) return;

        setPractitioner(practitionerData.practitioner);
        setSlots(availabilityData.slots || []);
        setConsultationType((current) =>
          current || practitionerData.practitioner?.consultationTypes?.[0] || ""
        );
      } catch (err) {
        if (!cancelled) setError(err.message || "Impossible de charger ce praticien");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPublicData();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setSelectedPetId("");
      return;
    }

    let cancelled = false;
    api("/api/pets")
      .then((data) => {
        if (cancelled) return;
        const nextPets = data.pets || [];
        setPets(nextPets);
        setSelectedPetId((current) => current || nextPets[0]?._id || "");
      })
      .catch(() => {
        if (!cancelled) setPets([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const clinic = practitioner?.clinicIds?.[0] || null;
  const selectedPet = pets.find((pet) => pet._id === selectedPetId) || null;

  const compatibleSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (consultationType && slot.consultationType !== consultationType) return false;
      if (selectedPet && slot.acceptedSpecies?.length && !slot.acceptedSpecies.includes(selectedPet.species)) return false;
      if (reason && slot.allowedReasons?.length && !slot.allowedReasons.includes(reason)) return false;
      return true;
    });
  }, [slots, consultationType, selectedPet, reason]);

  const slotsByDay = useMemo(() => {
    const groups = new Map();
    compatibleSlots.forEach((slot) => {
      const key = new Date(slot.startsAt).toISOString().slice(0, 10);
      const current = groups.get(key) || [];
      current.push(slot);
      groups.set(key, current);
    });
    return Array.from(groups.entries()).slice(0, 7);
  }, [compatibleSlots]);

  useEffect(() => {
    if (selectedSlotId && !compatibleSlots.some((slot) => slot._id === selectedSlotId)) {
      setSelectedSlotId("");
    }
  }, [compatibleSlots, selectedSlotId]);

  const waitlistQuery = useMemo(() => {
    const query = new URLSearchParams({ reason });
    if (consultationType) query.set("type", consultationType);
    if (selectedPet?.species) query.set("species", selectedPet.species);
    if (clinic?.address?.city) query.set("city", clinic.address.city);
    if (clinic?._id) query.set("clinicId", clinic._id);
    if (practitioner?._id) query.set("practitionerId", practitioner._id);
    return query.toString();
  }, [reason, consultationType, selectedPet, clinic, practitioner]);

  async function bookAppointment() {
    if (!user) {
      nav("/login", { state: { from: `/p/${id}?book=1` } });
      return;
    }
    if (!selectedPetId) {
      setError("Ajoute d'abord un animal dans ton espace pour réserver.");
      return;
    }
    if (!selectedSlotId) {
      setError("Choisis un créneau disponible.");
      return;
    }

    setBooking(true);
    setError("");
    try {
      const data = await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify({ petId: selectedPetId, slotId: selectedSlotId, reason }),
      });
      setConfirmation(data.appointment);
      setSelectedSlotId("");
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "Impossible de réserver ce créneau");
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return <div className="max-w-[1200px] mx-auto px-6 py-10 text-muted">Chargement du praticien et des disponibilités…</div>;
  }

  if (!practitioner) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <Card className="p-6">
          <div className="font-semibold">Praticien introuvable</div>
          <div className="text-sm text-muted mt-1">{error || "Ce profil n'est pas disponible."}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-20 py-6">
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-2xl font-semibold">{practitioner.displayName}</div>
              {practitioner.verified ? <Tag>Vérifié</Tag> : null}
            </div>
            <div className="text-sm text-muted mt-1">{practitioner.title || "Vétérinaire"}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(practitioner.specialties || []).map((specialty) => <Tag key={specialty}>{specialty}</Tag>)}
              {(practitioner.acceptedSpecies || []).slice(0, 6).map((species) => <Tag key={species}>{species}</Tag>)}
            </div>
            <div className="mt-3 text-sm text-muted">
              {practitioner.reviewsCount > 0 ? `★ ${Number(practitioner.rating || 0).toFixed(1)} (${practitioner.reviewsCount} avis)` : "Nouveau praticien"}
              {clinic ? ` • ${clinic.name}` : ""}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="w-full sm:w-[200px]" onClick={() => document.getElementById("booking-card")?.scrollIntoView({ behavior: "smooth" })}>
              Prendre rendez-vous
            </Button>
            <Button variant="secondary" className="w-full sm:w-[200px]" disabled>
              Messagerie bientôt
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="mt-4 p-4 border-red-200">
          <div className="text-sm text-red-600">{error}</div>
        </Card>
      ) : null}

      {confirmation ? (
        <Card className="mt-4 p-5 border-green-200">
          <div className="font-semibold">Rendez-vous confirmé ✓</div>
          <div className="text-sm text-muted mt-1">
            Ton créneau est réservé. Tu peux le retrouver et l'annuler depuis ton espace.
          </div>
          <Link to="/account"><Button className="mt-4">Voir mes rendez-vous</Button></Link>
        </Card>
      ) : null}

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-2">
            {tabList.map((item) => (
              <Chip key={item} selected={tab === item} onClick={() => setTab(item)}>{item}</Chip>
            ))}
          </div>

          <Card className="p-5">
            <div className="text-lg font-semibold">{tab}</div>

            {tab === "Infos" ? (
              <div className="mt-3 space-y-4 text-sm">
                <div>
                  <div className="font-semibold">À propos</div>
                  <div className="text-muted mt-1">{practitioner.bio || "Présentation à venir."}</div>
                </div>
                <div>
                  <div className="font-semibold">Types de consultation</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(practitioner.consultationTypes || []).map((type) => <Tag key={type}>{consultationLabels[type] || type}</Tag>)}
                  </div>
                </div>
                {clinic?.equipment?.length ? (
                  <div>
                    <div className="font-semibold">Équipements</div>
                    <div className="text-muted mt-1">{clinic.equipment.join(" • ")}</div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "Services" ? (
              <div className="mt-3">
                {clinic?.services?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {clinic.services.map((service) => <Tag key={service}>{service}</Tag>)}
                  </div>
                ) : (
                  <div className="text-sm text-muted">Les services détaillés seront renseignés par l'établissement.</div>
                )}
              </div>
            ) : null}

            {tab === "Avis" ? (
              <div className="mt-3 text-sm text-muted">
                {practitioner.reviewsCount > 0
                  ? `${practitioner.reviewsCount} avis agrégés. Le détail des avis vérifiés sera ajouté dans une prochaine version.`
                  : "Aucun avis vérifié pour le moment."}
              </div>
            ) : null}

            {tab === "Accès" ? (
              <div className="mt-3 text-sm text-muted space-y-1">
                <div>{clinic?.name || "Établissement"}</div>
                <div>{[clinic?.address?.line1, clinic?.address?.postalCode, clinic?.address?.city].filter(Boolean).join(", ") || "Adresse à venir"}</div>
                {clinic?.phone ? <div>Tél. {clinic.phone}</div> : null}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5" id="booking-card">
          <Card className={`p-4 lg:sticky lg:top-[96px] ${autoBook ? "ring-2 ring-brand/25" : ""}`}>
            <div className="text-lg font-semibold">Choisir un créneau</div>

            <div className="mt-3 space-y-3">
              {user ? (
                pets.length ? (
                  <Select label="Animal" value={selectedPetId} onChange={(e) => setSelectedPetId(e.target.value)}>
                    {pets.map((pet) => <option key={pet._id} value={pet._id}>{pet.name} — {pet.species}</option>)}
                  </Select>
                ) : (
                  <div className="rounded-xl border border-border p-3 text-sm">
                    Aucun animal enregistré. <Link className="text-brand font-medium" to="/account">Ajouter un animal</Link>
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-border p-3 text-sm text-muted">
                  Tu peux consulter les disponibilités sans compte. La connexion est demandée uniquement pour réserver.
                </div>
              )}

              <Select label="Motif" value={reason} onChange={(e) => setReason(e.target.value)}>
                {reasonOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>

              <Select label="Type" value={consultationType} onChange={(e) => setConsultationType(e.target.value)}>
                {(practitioner.consultationTypes || []).map((type) => (
                  <option key={type} value={type}>{consultationLabels[type] || type}</option>
                ))}
              </Select>

              <div>
                <div className="mb-2 text-xs text-muted">Créneaux compatibles</div>
                {slotsByDay.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted">
                    <div>Aucun créneau compatible dans les 7 prochains jours.</div>
                    {reason === "urgent" ? (
                      <div className="mt-2">Pour une urgence nécessitant une prise en charge immédiate, contacte directement un service vétérinaire d'urgence ou de garde.</div>
                    ) : (
                      <Link to={`/waitlist/new?${waitlistQuery}`}>
                        <Button className="mt-3 w-full" variant="secondary">🔔 Surveiller les désistements</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                    {slotsByDay.map(([day, daySlots]) => (
                      <div key={day}>
                        <div className="text-sm font-medium capitalize">{formatDay(daySlots[0].startsAt)}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {daySlots.map((slot) => (
                            <button
                              key={slot._id}
                              type="button"
                              onClick={() => setSelectedSlotId(slot._id)}
                              className={[
                                "h-10 px-3 rounded-xl border text-sm transition",
                                selectedSlotId === slot._id
                                  ? "bg-brand text-white border-brand"
                                  : "bg-white border-border hover:bg-black/2",
                              ].join(" ")}
                            >
                              {formatTime(slot.startsAt)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="w-full h-12"
                onClick={bookAppointment}
                disabled={booking || (user && (!selectedPetId || !selectedSlotId))}
              >
                {booking ? "Réservation…" : user ? "Confirmer le rendez-vous" : "Se connecter pour réserver"}
              </Button>

              <div className="text-xs text-muted">
                Le créneau est attribué au premier utilisateur qui confirme. PetLib empêche la double réservation côté serveur.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
