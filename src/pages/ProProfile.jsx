import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";
import ProNav from "../components/ProNav.jsx";

const speciesOptions = [
  ["dog", "Chien"], ["cat", "Chat"], ["rabbit", "Lapin"], ["bird", "Oiseau"],
  ["reptile", "Reptile"], ["rodent", "Rongeur"], ["ferret", "Furet"],
  ["equine", "Équidé"], ["farm", "Animal de ferme"], ["other", "Autre"],
];

const consultationOptions = [
  ["clinic", "En clinique"], ["tele", "Téléconsultation"],
  ["home", "À domicile"], ["farm", "Élevage / ferme"],
];

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function commaList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export default function ProProfile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPractitioner, setSavingPractitioner] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [practitionerForm, setPractitionerForm] = useState(null);
  const [clinicForm, setClinicForm] = useState(null);

  const clinics = useMemo(() => {
    const found = new Map();
    for (const clinic of data?.practitioner?.clinicIds || []) found.set(String(clinic._id), clinic);
    for (const clinic of data?.membershipClinics || []) found.set(String(clinic._id), clinic);
    return [...found.values()];
  }, [data]);

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const settings = await api("/api/pro/settings");
      setData(settings);
      const practitioner = settings.practitioner;
      if (practitioner) {
        setPractitionerForm({
          displayName: practitioner.displayName || "",
          title: practitioner.title || "Vétérinaire",
          bio: practitioner.bio || "",
          specialties: (practitioner.specialties || []).join(", "),
          languages: (practitioner.languages || []).join(", "),
          acceptedSpecies: practitioner.acceptedSpecies || [],
          consultationTypes: practitioner.consultationTypes || [],
          pricing: (practitioner.pricing || []).map((item) => ({
            label: item.label || "",
            euros: (Number(item.amountCents || 0) / 100).toFixed(2),
            consultationType: item.consultationType || "clinic",
          })),
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    if (!clinics.length) {
      setSelectedClinicId("");
      setClinicForm(null);
      return;
    }
    const chosen = clinics.find((clinic) => String(clinic._id) === String(selectedClinicId)) || clinics[0];
    if (String(chosen._id) !== String(selectedClinicId)) setSelectedClinicId(String(chosen._id));
    setClinicForm({
      name: chosen.name || "",
      description: chosen.description || "",
      line1: chosen.address?.line1 || "",
      line2: chosen.address?.line2 || "",
      postalCode: chosen.address?.postalCode || "",
      city: chosen.address?.city || "",
      country: chosen.address?.country || "France",
      phone: chosen.phone || "",
      email: chosen.email || "",
      website: chosen.website || "",
      services: (chosen.services || []).join(", "),
      equipment: (chosen.equipment || []).join(", "),
      acceptedSpecies: chosen.acceptedSpecies || [],
      consultationTypes: chosen.consultationTypes || [],
      emergencyCapability: Boolean(chosen.emergencyCapability),
      homeVisitRadiusKm: Number(chosen.homeVisitRadiusKm || 0),
      verified: Boolean(chosen.verified),
    });
  }, [clinics, selectedClinicId]);

  async function savePractitioner(e) {
    e.preventDefault();
    setSavingPractitioner(true);
    setError("");
    setSuccess("");
    try {
      await api("/api/pro/settings/practitioner", {
        method: "PATCH",
        body: JSON.stringify({
          ...practitionerForm,
          specialties: commaList(practitionerForm.specialties),
          languages: commaList(practitionerForm.languages),
          pricing: practitionerForm.pricing.map((item) => ({
            label: item.label,
            amountCents: Math.max(0, Math.round(Number(String(item.euros).replace(",", ".")) * 100)),
            consultationType: item.consultationType,
          })),
        }),
      });
      setSuccess("Profil praticien enregistré.");
      await loadSettings();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingPractitioner(false);
    }
  }

  async function saveClinic(e) {
    e.preventDefault();
    setSavingClinic(true);
    setError("");
    setSuccess("");
    try {
      await api(`/api/pro/settings/clinics/${selectedClinicId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: clinicForm.name,
          description: clinicForm.description,
          address: {
            line1: clinicForm.line1,
            line2: clinicForm.line2,
            postalCode: clinicForm.postalCode,
            city: clinicForm.city,
            country: clinicForm.country,
          },
          phone: clinicForm.phone,
          email: clinicForm.email,
          website: clinicForm.website,
          services: commaList(clinicForm.services),
          equipment: commaList(clinicForm.equipment),
          acceptedSpecies: clinicForm.acceptedSpecies,
          consultationTypes: clinicForm.consultationTypes,
          emergencyCapability: clinicForm.emergencyCapability,
          homeVisitRadiusKm: clinicForm.homeVisitRadiusKm,
        }),
      });
      setSuccess("Structure enregistrée.");
      await loadSettings();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingClinic(false);
    }
  }

  if (loading) return <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-10 text-muted">Chargement du profil professionnel…</div>;

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <ProNav />
      <div className="mt-6">
        <Tag>Profil professionnel</Tag>
        <h1 className="mt-3 text-3xl font-semibold">Informations visibles par les propriétaires</h1>
        <p className="mt-1 text-muted">Modifie les informations publiques sans pouvoir modifier toi-même les statuts de vérification PetLib.</p>
      </div>

      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

      <div className="mt-6 space-y-6">
        {practitionerForm ? (
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Profil praticien</h2>
                <p className="text-sm text-muted">Présentation, spécialités et tarifs indicatifs.</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${data.practitioner?.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                {data.practitioner?.verified ? "Vérifié" : "Non vérifié"}
              </span>
            </div>

            <form className="mt-5 space-y-5" onSubmit={savePractitioner}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Nom affiché</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={practitionerForm.displayName} onChange={(e) => setPractitionerForm({ ...practitionerForm, displayName: e.target.value })} required /></div>
                <div><label className="text-sm font-medium">Titre</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={practitionerForm.title} onChange={(e) => setPractitionerForm({ ...practitionerForm, title: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium">Présentation</label><textarea className="mt-1 min-h-28 w-full rounded-xl border border-border px-3 py-2" value={practitionerForm.bio} onChange={(e) => setPractitionerForm({ ...practitionerForm, bio: e.target.value })} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Spécialités</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={practitionerForm.specialties} onChange={(e) => setPractitionerForm({ ...practitionerForm, specialties: e.target.value })} placeholder="NAC, dermatologie, chirurgie" /></div>
                <div><label className="text-sm font-medium">Langues</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={practitionerForm.languages} onChange={(e) => setPractitionerForm({ ...practitionerForm, languages: e.target.value })} placeholder="Français, anglais" /></div>
              </div>

              <div>
                <div className="text-sm font-medium">Espèces prises en charge</div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2">{speciesOptions.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><input type="checkbox" checked={practitionerForm.acceptedSpecies.includes(value)} onChange={() => setPractitionerForm({ ...practitionerForm, acceptedSpecies: toggleValue(practitionerForm.acceptedSpecies, value) })} />{label}</label>)}</div>
              </div>

              <div>
                <div className="text-sm font-medium">Types de consultation</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">{consultationOptions.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><input type="checkbox" checked={practitionerForm.consultationTypes.includes(value)} onChange={() => setPractitionerForm({ ...practitionerForm, consultationTypes: toggleValue(practitionerForm.consultationTypes, value) })} />{label}</label>)}</div>
              </div>

              <div>
                <div className="flex items-center justify-between"><div className="text-sm font-medium">Tarifs indicatifs</div><button type="button" className="text-sm font-medium text-brand" onClick={() => setPractitionerForm({ ...practitionerForm, pricing: [...practitionerForm.pricing, { label: "", euros: "", consultationType: "clinic" }] })}>+ Ajouter</button></div>
                <div className="mt-2 space-y-2">
                  {practitionerForm.pricing.length ? practitionerForm.pricing.map((price, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_150px_180px_auto] gap-2">
                      <input className="rounded-xl border border-border px-3 py-2" placeholder="Consultation générale" value={price.label} onChange={(e) => { const pricing = [...practitionerForm.pricing]; pricing[index] = { ...price, label: e.target.value }; setPractitionerForm({ ...practitionerForm, pricing }); }} />
                      <input className="rounded-xl border border-border px-3 py-2" inputMode="decimal" placeholder="45,00 €" value={price.euros} onChange={(e) => { const pricing = [...practitionerForm.pricing]; pricing[index] = { ...price, euros: e.target.value }; setPractitionerForm({ ...practitionerForm, pricing }); }} />
                      <select className="rounded-xl border border-border px-3 py-2" value={price.consultationType} onChange={(e) => { const pricing = [...practitionerForm.pricing]; pricing[index] = { ...price, consultationType: e.target.value }; setPractitionerForm({ ...practitionerForm, pricing }); }}>{consultationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                      <button type="button" className="rounded-xl border border-border px-3 py-2 text-sm" onClick={() => setPractitionerForm({ ...practitionerForm, pricing: practitionerForm.pricing.filter((_, itemIndex) => itemIndex !== index) })}>Retirer</button>
                    </div>
                  )) : <div className="text-sm text-muted">Aucun tarif renseigné.</div>}
                </div>
              </div>

              <Button disabled={savingPractitioner}>{savingPractitioner ? "Enregistrement…" : "Enregistrer le profil"}</Button>
            </form>
          </Card>
        ) : null}

        {clinics.length ? (
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div><h2 className="text-xl font-semibold">Structure</h2><p className="text-sm text-muted">Coordonnées et services publics.</p></div>
              <select className="rounded-xl border border-border px-3 py-2" value={selectedClinicId} onChange={(e) => setSelectedClinicId(e.target.value)}>{clinics.map((clinic) => <option key={clinic._id} value={clinic._id}>{clinic.name}</option>)}</select>
            </div>

            {clinicForm ? (
              <form className="mt-5 space-y-4" onSubmit={saveClinic}>
                <div className={`inline-flex rounded-full px-3 py-1 text-xs ${clinicForm.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{clinicForm.verified ? "Structure vérifiée" : "Structure non vérifiée"}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-sm font-medium">Nom</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} /></div><div><label className="text-sm font-medium">Téléphone</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} /></div></div>
                <div><label className="text-sm font-medium">Description</label><textarea className="mt-1 min-h-24 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.description} onChange={(e) => setClinicForm({ ...clinicForm, description: e.target.value })} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-sm font-medium">Email</label><input type="email" className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.email} onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })} /></div><div><label className="text-sm font-medium">Site web</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.website} onChange={(e) => setClinicForm({ ...clinicForm, website: e.target.value })} /></div></div>
                <div><label className="text-sm font-medium">Adresse</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.line1} onChange={(e) => setClinicForm({ ...clinicForm, line1: e.target.value })} /></div>
                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3"><input className="rounded-xl border border-border px-3 py-2" placeholder="Code postal" value={clinicForm.postalCode} onChange={(e) => setClinicForm({ ...clinicForm, postalCode: e.target.value })} /><input className="rounded-xl border border-border px-3 py-2" placeholder="Ville" value={clinicForm.city} onChange={(e) => setClinicForm({ ...clinicForm, city: e.target.value })} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="text-sm font-medium">Services</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.services} onChange={(e) => setClinicForm({ ...clinicForm, services: e.target.value })} placeholder="Vaccination, imagerie, chirurgie" /></div><div><label className="text-sm font-medium">Équipements</label><input className="mt-1 w-full rounded-xl border border-border px-3 py-2" value={clinicForm.equipment} onChange={(e) => setClinicForm({ ...clinicForm, equipment: e.target.value })} placeholder="Radiographie, échographie" /></div></div>
                <div className="flex flex-wrap items-center gap-5"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clinicForm.emergencyCapability} onChange={(e) => setClinicForm({ ...clinicForm, emergencyCapability: e.target.checked })} />Prise en charge d’urgences</label><label className="text-sm">Rayon domicile <input type="number" min="0" max="500" className="ml-2 w-24 rounded-xl border border-border px-3 py-2" value={clinicForm.homeVisitRadiusKm} onChange={(e) => setClinicForm({ ...clinicForm, homeVisitRadiusKm: Number(e.target.value) })} /> km</label></div>
                <Button disabled={savingClinic}>{savingClinic ? "Enregistrement…" : "Enregistrer la structure"}</Button>
              </form>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
