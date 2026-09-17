import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";
import ProNav from "../components/ProNav.jsx";
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

const consultationOptions = [
  ["clinic", "En clinique"],
  ["tele", "Téléconsultation"],
  ["home", "À domicile"],
  ["farm", "Déplacement élevage/ferme"],
];

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toggleValue(current, value) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function buildSlots(dateValue, startTime, endTime, durationMinutes) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const cursor = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
  const result = [];

  while (cursor < end) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60000);
    if (slotEnd > end) break;
    result.push({ startsAt: cursor.toISOString(), endsAt: slotEnd.toISOString() });
    cursor.setTime(slotEnd.getTime());
  }
  return result;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function slotStatus(status) {
  return {
    available: "Libre",
    held: "Réservé temporairement",
    booked: "Réservé",
    blocked: "Bloqué",
  }[status] || status;
}

export default function ProAvailability() {
  const { user } = useAuth();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [context, setContext] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    clinicId: "",
    date: dateInputValue(tomorrow),
    startTime: "09:00",
    endTime: "12:00",
    durationMinutes: 30,
    consultationType: "clinic",
    acceptedSpecies: [],
    reasons: "consultation, vaccin",
  });

  const clinics = useMemo(() => {
    const found = new Map();
    for (const clinic of context?.practitioner?.clinicIds || []) found.set(String(clinic._id), clinic);
    for (const membership of context?.memberships || []) {
      const clinic = membership.clinicId;
      if (clinic?._id) found.set(String(clinic._id), clinic);
    }
    return [...found.values()];
  }, [context]);

  const previewSlots = useMemo(() => {
    const duration = Number(form.durationMinutes);
    if (!form.date || !form.startTime || !form.endTime || !duration) return [];
    return buildSlots(form.date, form.startTime, form.endTime, duration);
  }, [form.date, form.startTime, form.endTime, form.durationMinutes]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const proContext = await api("/api/pro/me");
      setContext(proContext);
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const availability = await api(`/api/pro/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      setSlots(availability.slots || []);

      const practitioner = proContext.practitioner;
      setForm((current) => ({
        ...current,
        clinicId: current.clinicId || practitioner?.clinicIds?.[0]?._id || proContext.memberships?.[0]?.clinicId?._id || "",
        consultationType: practitioner?.consultationTypes?.[0] || current.consultationType,
        acceptedSpecies: current.acceptedSpecies.length ? current.acceptedSpecies : practitioner?.acceptedSpecies || [],
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createSlots(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!form.clinicId) throw new Error("Ajoute d’abord une structure à ton espace professionnel");
      if (!previewSlots.length) throw new Error("La plage horaire ne permet de créer aucun créneau");

      const data = await api("/api/pro/availability/bulk", {
        method: "POST",
        body: JSON.stringify({
          clinicId: form.clinicId,
          consultationType: form.consultationType,
          acceptedSpecies: form.acceptedSpecies,
          allowedReasons: form.reasons.split(",").map((value) => value.trim()).filter(Boolean),
          slots: previewSlots,
        }),
      });
      setSuccess(`${data.created} créneau${data.created > 1 ? "x" : ""} créé${data.created > 1 ? "s" : ""}.`);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeSlot(slotId, action) {
    setMutatingId(slotId);
    setError("");
    setSuccess("");
    try {
      await api(`/api/pro/availability/${slotId}/${action}`, { method: "PATCH" });
      setSuccess(action === "block" ? "Créneau bloqué." : "Créneau rouvert.");
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setMutatingId("");
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <ProNav />

      <div className="mt-6">
        <Tag>Disponibilités</Tag>
        <h1 className="mt-3 text-3xl font-semibold">Gérer les créneaux ouverts à la réservation</h1>
        <p className="mt-1 text-muted">Crée des plages en série, bloque un créneau libre ou rouvre-le sans toucher aux rendez-vous déjà réservés.</p>
      </div>

      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Créer une plage</h2>
          <p className="mt-1 text-sm text-muted">PetLib découpe automatiquement la plage selon la durée choisie.</p>

          {user?.role !== "practitioner" ? (
            <div className="mt-4 rounded-xl border border-border bg-black/2 p-4 text-sm text-muted">
              La création multi-praticiens depuis un compte administrateur de clinique sera ajoutée avec la gestion d’équipe. Cette vue reste consultable.
            </div>
          ) : clinics.length ? (
            <form className="mt-5 space-y-4" onSubmit={createSlots}>
              <div>
                <label className="text-sm font-medium">Structure</label>
                <select className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={form.clinicId} onChange={(e) => setForm({ ...form, clinicId: e.target.value })}>
                  {clinics.map((clinic) => <option key={clinic._id} value={clinic._id}>{clinic.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <input type="date" className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Début</label>
                  <input type="time" className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Fin</label>
                  <input type="time" className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Durée</label>
                  <select className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}>
                    {[15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value} min</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Type de consultation</label>
                  <select className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={form.consultationType} onChange={(e) => setForm({ ...form, consultationType: e.target.value })}>
                    {consultationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Espèces acceptées</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {speciesOptions.map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                      <input type="checkbox" checked={form.acceptedSpecies.includes(value)} onChange={() => setForm({ ...form, acceptedSpecies: toggleValue(form.acceptedSpecies, value) })} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Motifs acceptés</label>
                <input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={form.reasons} onChange={(e) => setForm({ ...form, reasons: e.target.value })} placeholder="consultation, vaccin, suivi" />
                <div className="mt-1 text-xs text-muted">Sépare les motifs par des virgules. Vide = tous les motifs.</div>
              </div>

              <div className="rounded-xl bg-black/3 p-4 text-sm">
                Aperçu : <strong>{previewSlots.length}</strong> créneau{previewSlots.length > 1 ? "x" : ""} sera{previewSlots.length > 1 ? "ont" : ""} créé{previewSlots.length > 1 ? "s" : ""}.
              </div>

              <Button className="w-full h-12" disabled={saving}>{saving ? "Création…" : "Créer les créneaux"}</Button>
            </form>
          ) : (
            <div className="mt-4 text-sm text-muted">
              Aucune structure n’est rattachée à ton profil. <Link to="/pro" className="font-medium text-brand hover:underline">Retourne au tableau de bord pour en ajouter une.</Link>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">30 prochains jours</h2>
              <p className="text-sm text-muted">{slots.length} créneau{slots.length > 1 ? "x" : ""} trouvé{slots.length > 1 ? "s" : ""}.</p>
            </div>
            <button type="button" onClick={loadData} className="text-sm font-medium text-brand hover:underline">Actualiser</button>
          </div>

          <div className="mt-4 space-y-2 max-h-[720px] overflow-auto pr-1">
            {loading ? <div className="text-sm text-muted">Chargement…</div> : slots.length ? slots.map((slot) => (
              <div key={slot._id} className="rounded-xl border border-border p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{formatDateTime(slot.startsAt)}</div>
                  <div className="mt-1 text-sm text-muted">{slot.clinicId?.name || "Structure"} · {slot.consultationType} · {slotStatus(slot.status)}</div>
                  {slot.acceptedSpecies?.length ? <div className="mt-1 text-xs text-muted">{slot.acceptedSpecies.join(", ")}</div> : null}
                </div>
                <div>
                  {slot.status === "available" ? (
                    <button type="button" disabled={mutatingId === slot._id} onClick={() => changeSlot(slot._id, "block")} className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-black/2 disabled:opacity-50">Bloquer</button>
                  ) : slot.status === "blocked" ? (
                    <button type="button" disabled={mutatingId === slot._id} onClick={() => changeSlot(slot._id, "reopen")} className="rounded-xl border border-brand px-3 py-2 text-sm text-brand hover:bg-brand/5 disabled:opacity-50">Rouvrir</button>
                  ) : (
                    <span className="text-xs text-muted">Protégé</span>
                  )}
                </div>
              </div>
            )) : <div className="py-8 text-center text-sm text-muted">Aucun créneau à venir.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
