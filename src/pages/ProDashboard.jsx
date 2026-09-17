import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";

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

function todayBounds() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toggleValue(current, value) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export default function ProDashboard() {
  const { user } = useAuth();
  const [context, setContext] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.fullName || "",
    title: "Vétérinaire",
    bio: "",
    acceptedSpecies: ["dog", "cat"],
    consultationTypes: ["clinic"],
  });
  const [clinicForm, setClinicForm] = useState({
    name: "",
    line1: "",
    postalCode: "",
    city: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const proContext = await api("/api/pro/me");
      setContext(proContext);

      if (proContext.onboardingComplete) {
        const { from, to } = todayBounds();
        const data = await api(`/api/pro/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        setDashboard(data);
      } else {
        setDashboard(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!context?.practitioner) return;
    const practitioner = context.practitioner;
    setProfileForm({
      displayName: practitioner.displayName || user?.fullName || "",
      title: practitioner.title || "Vétérinaire",
      bio: practitioner.bio || "",
      acceptedSpecies: practitioner.acceptedSpecies || [],
      consultationTypes: practitioner.consultationTypes || [],
    });
  }, [context, user]);

  const clinics = useMemo(() => {
    const found = new Map();
    for (const clinic of context?.practitioner?.clinicIds || []) found.set(String(clinic._id), clinic);
    for (const membership of context?.memberships || []) {
      const clinic = membership.clinicId;
      if (clinic?._id) found.set(String(clinic._id), clinic);
    }
    return [...found.values()];
  }, [context]);

  async function submitProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    try {
      await api("/api/pro/profile", {
        method: "POST",
        body: JSON.stringify(profileForm),
      });
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitClinic(e) {
    e.preventDefault();
    setSavingClinic(true);
    setError("");
    try {
      await api("/api/pro/clinics", {
        method: "POST",
        body: JSON.stringify({
          name: clinicForm.name,
          address: {
            line1: clinicForm.line1,
            postalCode: clinicForm.postalCode,
            city: clinicForm.city,
            country: "France",
          },
          acceptedSpecies: profileForm.acceptedSpecies,
          consultationTypes: profileForm.consultationTypes,
        }),
      });
      setClinicForm({ name: "", line1: "", postalCode: "", city: "" });
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingClinic(false);
    }
  }

  if (loading) return <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-10 text-muted">Chargement de l’espace professionnel…</div>;

  if (!context?.onboardingComplete && user?.role === "practitioner") {
    return (
      <div className="max-w-[900px] mx-auto px-6 lg:px-20 py-10">
        <Tag>Espace professionnel</Tag>
        <h1 className="mt-3 text-3xl font-semibold">Configure ton profil praticien</h1>
        <p className="mt-2 text-muted">Ce profil restera non vérifié tant qu’un contrôle PetLib n’aura pas été effectué.</p>

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <Card className="mt-6 p-6">
          <form className="space-y-5" onSubmit={submitProfile}>
            <div>
              <label className="text-sm font-medium">Nom affiché</label>
              <input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={profileForm.displayName} onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Titre</label>
              <input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={profileForm.title} onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Présentation</label>
              <textarea className="mt-1 min-h-28 w-full rounded-xl border border-border px-3 py-2" value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
            </div>

            <div>
              <div className="text-sm font-medium">Espèces prises en charge</div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {speciesOptions.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                    <input type="checkbox" checked={profileForm.acceptedSpecies.includes(value)} onChange={() => setProfileForm({ ...profileForm, acceptedSpecies: toggleValue(profileForm.acceptedSpecies, value) })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium">Types de consultation</div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {consultationOptions.map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                    <input type="checkbox" checked={profileForm.consultationTypes.includes(value)} onChange={() => setProfileForm({ ...profileForm, consultationTypes: toggleValue(profileForm.consultationTypes, value) })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <Button className="w-full h-12" disabled={savingProfile}>{savingProfile ? "Création…" : "Créer mon espace professionnel"}</Button>
          </form>
        </Card>
      </div>
    );
  }

  const metrics = dashboard?.metrics || {};

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <Tag>Espace professionnel</Tag>
          <h1 className="mt-3 text-3xl font-semibold">Bonjour {dashboard?.practitioner?.displayName || user?.fullName || "professionnel"}</h1>
          <p className="mt-1 text-muted">Voici l’activité PetLib de ton espace aujourd’hui.</p>
        </div>
        {dashboard?.practitioner ? (
          <span className={`inline-flex rounded-full px-3 py-1 text-sm ${dashboard.practitioner.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
            {dashboard.practitioner.verified ? "Profil vérifié" : "Vérification en attente"}
          </span>
        ) : null}
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["RDV aujourd’hui", metrics.todayAppointments ?? 0],
          ["RDV à venir (30 j)", metrics.upcomingAppointments ?? 0],
          ["Créneaux libres", metrics.availableSlots ?? 0],
          ["Récupérés par Waitlist", metrics.waitlistRecovered ?? 0],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <div className="text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-sm text-muted">{label}</div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Prochains rendez-vous</h2>
              <p className="text-sm text-muted">Les 5 prochains rendez-vous confirmés ou en attente.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {(dashboard?.nextAppointments || []).length ? dashboard.nextAppointments.map((appointment) => (
              <div key={appointment._id} className="rounded-xl border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-medium">{appointment.petId?.name || "Animal"} · {appointment.reason}</div>
                  <div className="text-sm text-muted">{appointment.petId?.species || "Espèce non précisée"} · {appointment.clinicId?.name || "Structure"}</div>
                  {appointment.source === "waitlist" ? <div className="mt-1 text-xs font-medium text-brand">Créneau récupéré via Smart Waitlist</div> : null}
                </div>
                <div className="text-sm font-medium">{formatDateTime(appointment.startsAt)}</div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">Aucun rendez-vous à venir.</div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Structure(s)</h2>
            <div className="mt-3 space-y-2">
              {clinics.length ? clinics.map((clinic) => (
                <div key={clinic._id} className="rounded-xl border border-border p-3">
                  <div className="font-medium">{clinic.name}</div>
                  <div className="text-sm text-muted">{[clinic.address?.postalCode, clinic.address?.city].filter(Boolean).join(" ") || "Adresse à compléter"}</div>
                  <div className="mt-1 text-xs text-muted">{clinic.verified ? "Structure vérifiée" : "Vérification en attente"}</div>
                </div>
              )) : <div className="text-sm text-muted">Aucune structure rattachée pour le moment.</div>}
            </div>
          </Card>

          {!clinics.length && user?.role !== "admin" ? (
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Ajouter ma structure</h2>
              <p className="mt-1 text-sm text-muted">Elle restera non vérifiée jusqu’au contrôle PetLib.</p>
              <form className="mt-4 space-y-3" onSubmit={submitClinic}>
                <input className="w-full rounded-xl border border-border px-3 py-2" placeholder="Nom de la clinique / cabinet" value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} required />
                <input className="w-full rounded-xl border border-border px-3 py-2" placeholder="Adresse" value={clinicForm.line1} onChange={(e) => setClinicForm({ ...clinicForm, line1: e.target.value })} />
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <input className="w-full rounded-xl border border-border px-3 py-2" placeholder="Code postal" value={clinicForm.postalCode} onChange={(e) => setClinicForm({ ...clinicForm, postalCode: e.target.value })} />
                  <input className="w-full rounded-xl border border-border px-3 py-2" placeholder="Ville" value={clinicForm.city} onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })} />
                </div>
                <Button className="w-full" disabled={savingClinic}>{savingClinic ? "Ajout…" : "Ajouter la structure"}</Button>
              </form>
            </Card>
          ) : null}
        </div>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold">Gestion professionnelle</h2>
        <p className="mt-1 text-sm text-muted">L’agenda, la création de créneaux et l’édition complète du profil arrivent dans la prochaine étape.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled className="rounded-xl border border-border px-4 py-2 text-sm text-muted">Agenda</button>
          <button type="button" disabled className="rounded-xl border border-border px-4 py-2 text-sm text-muted">Disponibilités</button>
          <button type="button" disabled className="rounded-xl border border-border px-4 py-2 text-sm text-muted">Profil professionnel</button>
        </div>
      </Card>
    </div>
  );
}
