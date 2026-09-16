import React, { useCallback, useEffect, useState } from "react";
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

export default function Account() {
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPet, setSavingPet] = useState(false);
  const [cancellingId, setCancellingId] = useState("");
  const [form, setForm] = useState({ name: "", species: "dog", breed: "", sex: "unknown" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [petData, appointmentData] = await Promise.all([
        api("/api/pets"),
        api("/api/appointments?limit=100"),
      ]);
      setPets(petData.pets || []);
      setAppointments(appointmentData.appointments || []);
    } catch (err) {
      setError(err.message || "Impossible de charger ton espace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    setCancellingId(id);
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
      setCancellingId("");
    }
  }

  const upcoming = appointments.filter(
    (appointment) => ["pending", "confirmed"].includes(appointment.status) && new Date(appointment.startsAt) > new Date()
  );
  const history = appointments.filter((appointment) => !upcoming.some((item) => item._id === appointment._id));

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <div>
        <h1 className="text-3xl font-semibold">Mon espace</h1>
        <div className="text-sm text-muted mt-1">{user?.fullName || user?.email}</div>
      </div>

      {error ? (
        <Card className="mt-5 p-4 border-red-200">
          <div className="text-sm text-red-600">{error}</div>
        </Card>
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
                    <Tag>{appointment.status === "confirmed" ? "Confirmé" : appointment.status}</Tag>
                    <Button
                      variant="secondary"
                      disabled={cancellingId === appointment._id}
                      onClick={() => cancelAppointment(appointment._id)}
                    >
                      {cancellingId === appointment._id ? "Annulation…" : "Annuler"}
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
