import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const speciesOptions = [
  ["dog", "Chien"],
  ["cat", "Chat"],
  ["rabbit", "Lapin"],
  ["bird", "Oiseau"],
  ["reptile", "Reptile"],
  ["rodent", "Rongeur"],
  ["ferret", "Furet"],
  ["equine", "Équidé"],
  ["farm", "Animal de ferme"],
  ["other", "Autre"],
];

const speciesLabels = Object.fromEntries(speciesOptions);

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function remainingLabel(expiresAt, now) {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export default function Account() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [waitlistRequests, setWaitlistRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPet, setSavingPet] = useState(false);
  const [actionId, setActionId] = useState("");
  const [now, setNow] = useState(new Date());
  const [form, setForm] = useState({ name: "", species: "dog", breed: "", sex: "unknown" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [petData, appointmentData, waitlistData, offerData] = await Promise.all([
        api("/api/pets"),
        api("/api/appointments?limit=100"),
        api("/api/waitlist"),
        api("/api/waitlist/offers/active"),
      ]);
      setPets(petData.pets || []);
      setAppointments(appointmentData.appointments || []);
      setWaitlistRequests(waitlistData.requests || []);
      setOffers(offerData.offers || []);
    } catch (err) {
      setError(err.message || "Impossible de charger ton espace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!offers.length) return undefined;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [offers.length]);

  async function addPet(event) {
    event.preventDefault();
    if (!form.name.trim()) return;

    setSavingPet(true);
    setError("");
    try {
      await api("/api/pets", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          species: form.species,
          breed: form.breed.trim(),
          sex: form.sex,
        }),
      });
      setForm({ name: "", species: "dog", breed: "", sex: "unknown" });
      await load();
    } catch (err) {
      setError(err.message || "Impossible d'ajouter cet animal");
    } finally {
      setSavingPet(false);
    }
  }

  async function cancelAppointment(id) {
    setActionId(id);
    setError("");
    try {
      await api(`/api/appointments/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Annulé depuis l'espace propriétaire" }),
      });
      await load();
    } catch (err) {
      setError(err.message || "Impossible d'annuler le rendez-vous");
    } finally {
      setActionId("");
    }
  }

  async function cancelWaitlist(id) {
    setActionId(id);
    setError("");
    try {
      await api(`/api/waitlist/${id}/cancel`, { method: "POST", body: "{}" });
      await load();
    } catch (err) {
      setError(err.message || "Impossible d'annuler l'alerte");
    } finally {
      setActionId("");
    }
  }

  async function respondToOffer(id, action) {
    setActionId(id);
    setError("");
    try {
      await api(`/api/waitlist/offers/${id}/${action}`, { method: "POST", body: "{}" });
      await load();
    } catch (err) {
      setError(err.message || "Impossible de traiter cette offre");
    } finally {
      setActionId("");
    }
  }

  const upcoming = appointments.filter(
    (appointment) => ["pending", "confirmed"].includes(appointment.status) && new Date(appointment.startsAt) > new Date()
  );
  const history = appointments.filter((appointment) => !upcoming.some((item) => item._id === appointment._id));
  const activeWaitlists = waitlistRequests.filter((request) => ["active", "offered"].includes(request.status));

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Mon espace</h1>
          <div className="text-sm text-muted mt-1">{user?.fullName || user?.email}</div>
        </div>
        <Link to="/waitlist/new"><Button variant="secondary">🔔 Nouvelle Smart Waitlist</Button></Link>
      </div>

      {params.get("waitlist") === "created" ? (
        <Card className="mt-5 p-4 border-green-200">
          <div className="font-semibold">Smart Waitlist activée ✓</div>
          <div className="text-sm text-muted mt-1">PetLib surveille maintenant les créneaux compatibles.</div>
        </Card>
      ) : null}

      {error ? (
        <Card className="mt-5 p-4 border-red-200">
          <div className="text-sm text-red-600">{error}</div>
        </Card>
      ) : null}

      {offers.length > 0 ? (
        <div className="mt-6 space-y-3">
          {offers.map((offer) => {
            const slot = offer.slotId;
            const pet = pets.find((item) => String(item._id) === String(offer.requestId?.petId));
            return (
              <Card key={offer._id} className="p-5 ring-2 ring-brand/25">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">🔔 Un créneau vient de se libérer</div>
                    <div className="text-sm mt-1">
                      {slot?.clinicId?.name} • {slot?.practitionerId?.displayName}
                    </div>
                    <div className="text-sm text-muted mt-1">
                      {slot?.startsAt ? formatDate(slot.startsAt) : ""}{pet ? ` • ${pet.name}` : ""}
                    </div>
                    <div className="text-sm font-semibold mt-2">
                      Réservé pour toi encore {remainingLabel(offer.expiresAt, now)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={actionId === offer._id}
                      onClick={() => respondToOffer(offer._id, "decline")}
                    >
                      Passer
                    </Button>
                    <Button
                      disabled={actionId === offer._id || new Date(offer.expiresAt) <= now}
                      onClick={() => respondToOffer(offer._id, "accept")}
                    >
                      Confirmer le RDV
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <Card className="p-5">
            <div className="text-lg font-semibold">Ajouter un animal</div>
            <form className="mt-4 space-y-3" onSubmit={addPet}>
              <Input
                label="Nom"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Nala, Kiwi…"
              />
              <Select
                label="Animal"
                value={form.species}
                onChange={(e) => setForm((current) => ({ ...current, species: e.target.value }))}
              >
                {speciesOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Input
                label="Race / sous-type (optionnel)"
                value={form.breed}
                onChange={(e) => setForm((current) => ({ ...current, breed: e.target.value }))}
              />
              <Select
                label="Sexe"
                value={form.sex}
                onChange={(e) => setForm((current) => ({ ...current, sex: e.target.value }))}
              >
                <option value="unknown">Non renseigné</option>
                <option value="female">Femelle</option>
                <option value="male">Mâle</option>
              </Select>
              <Button className="w-full" disabled={savingPet || !form.name.trim()}>
                {savingPet ? "Ajout…" : "Ajouter l'animal"}
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Mes animaux</div>
              <div className="text-sm text-muted">{pets.length}</div>
            </div>

            {loading ? <div className="mt-4 text-sm text-muted">Chargement…</div> : null}
            {!loading && pets.length === 0 ? (
              <div className="mt-4 text-sm text-muted">Ajoute ton premier animal pour pouvoir réserver un rendez-vous.</div>
            ) : null}

            <div className="mt-4 space-y-3">
              {pets.map((pet) => (
                <div key={pet._id} className="rounded-xl border border-border p-4">
                  <div className="font-semibold">{pet.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Tag>{speciesLabels[pet.species] || pet.species}</Tag>
                    {pet.breed ? <Tag>{pet.breed}</Tag> : null}
                  </div>
                  {pet.identificationNumber ? (
                    <div className="text-xs text-muted mt-2">Identification : {pet.identificationNumber}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Smart Waitlist</div>
              <div className="text-sm text-muted">{activeWaitlists.length} active{activeWaitlists.length > 1 ? "s" : ""}</div>
            </div>
            {activeWaitlists.length === 0 ? (
              <div className="mt-4 text-sm text-muted">Aucune surveillance active.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {activeWaitlists.map((request) => (
                  <div key={request._id} className="rounded-xl border border-border p-4">
                    <div className="font-semibold">{request.petId?.name || "Animal"} • {request.reason}</div>
                    <div className="text-sm text-muted mt-1">
                      {[request.city, request.postalCode].filter(Boolean).join(" ") || "Professionnel sélectionné"}
                      {request.consultationTypes?.length ? ` • ${request.consultationTypes.join(", ")}` : ""}
                    </div>
                    <div className="text-xs text-muted mt-2">Surveillance jusqu'au {formatDate(request.expiresAt)}</div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Tag>{request.status === "offered" ? "Créneau proposé" : "Surveillance active"}</Tag>
                      <Button
                        variant="secondary"
                        disabled={actionId === request._id}
                        onClick={() => cancelWaitlist(request._id)}
                      >
                        Désactiver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Mes prochains rendez-vous</div>
              <div className="text-sm text-muted">{upcoming.length}</div>
            </div>

            {loading ? <div className="mt-4 text-sm text-muted">Chargement…</div> : null}
            {!loading && upcoming.length === 0 ? (
              <div className="mt-4 text-sm text-muted">Aucun rendez-vous à venir.</div>
            ) : null}

            <div className="mt-4 space-y-3">
              {upcoming.map((appointment) => (
                <div key={appointment._id} className="rounded-xl border border-border p-4">
                  <div className="font-semibold">{appointment.clinicId?.name || "Clinique"}</div>
                  <div className="text-sm mt-1">{formatDate(appointment.startsAt)}</div>
                  <div className="text-sm text-muted mt-1">
                    {appointment.petId?.name} • {appointment.practitionerId?.displayName} • {appointment.reason}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Tag>{appointment.source === "waitlist" ? "Smart Waitlist" : appointment.status === "confirmed" ? "Confirmé" : appointment.status}</Tag>
                    <Button
                      variant="secondary"
                      disabled={actionId === appointment._id}
                      onClick={() => cancelAppointment(appointment._id)}
                    >
                      {actionId === appointment._id ? "Annulation…" : "Annuler"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold">Historique</div>
            {history.length === 0 ? (
              <div className="mt-4 text-sm text-muted">Ton historique apparaîtra ici.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {history.slice(0, 10).map((appointment) => (
                  <div key={appointment._id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="text-sm font-medium">{appointment.clinicId?.name || "Clinique"}</div>
                    <div className="text-xs text-muted mt-1">
                      {formatDate(appointment.startsAt)} • {appointment.petId?.name} • {appointment.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
