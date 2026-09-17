import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";
import ProNav from "../components/ProNav.jsx";

function roleLabel(role) {
  return {
    clinic_admin: "Administrateur clinique",
    practitioner: "Praticien",
    receptionist: "Accueil",
  }[role] || role;
}

export default function ProTeam() {
  const [clinics, setClinics] = useState([]);
  const [emails, setEmails] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingClinicId, setSavingClinicId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/pro/team");
      setClinics(data.clinics || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function addPractitioner(e, clinic) {
    e.preventDefault();
    const email = String(emails[clinic._id] || "").trim();
    if (!email) return;

    setSavingClinicId(clinic._id);
    setError("");
    setSuccess("");
    try {
      await api(`/api/pro/team/${clinic._id}/members`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmails((current) => ({ ...current, [clinic._id]: "" }));
      setSuccess(`Praticien ajouté à ${clinic.name}.`);
      await loadTeam();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingClinicId("");
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <ProNav />

      <div className="mt-6">
        <Tag>Équipe clinique</Tag>
        <h1 className="mt-3 text-3xl font-semibold">Gérer les praticiens de la structure</h1>
        <p className="mt-1 text-muted">
          Visualise les professionnels rattachés à chaque structure et ajoute un praticien qui possède déjà un compte PetLib.
        </p>
      </div>

      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

      <div className="mt-6 space-y-6">
        {loading ? (
          <Card className="p-6 text-sm text-muted">Chargement de l’équipe…</Card>
        ) : clinics.length ? (
          clinics.map((clinic) => (
            <Card key={clinic._id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{clinic.name}</h2>
                  <div className="mt-1 text-sm text-muted">
                    {[clinic.address?.postalCode, clinic.address?.city].filter(Boolean).join(" ") || "Adresse à compléter"}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {clinic.verified ? "Structure vérifiée" : "Structure en attente de vérification"}
                  </div>
                </div>
                <div className="rounded-full bg-black/5 px-3 py-1 text-sm text-muted">
                  {clinic.practitioners?.length || 0} praticien{clinic.practitioners?.length > 1 ? "s" : ""}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {(clinic.practitioners || []).map((practitioner) => (
                  <div key={practitioner._id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{practitioner.displayName}</div>
                        <div className="text-sm text-muted">{practitioner.title || "Vétérinaire"}</div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${practitioner.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                        {practitioner.verified ? "Vérifié" : "À vérifier"}
                      </span>
                    </div>
                    {practitioner.userId?.email ? (
                      <div className="mt-3 text-xs text-muted">{practitioner.userId.email}</div>
                    ) : null}
                    {practitioner.specialties?.length ? (
                      <div className="mt-2 text-xs text-muted">{practitioner.specialties.join(" · ")}</div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-border pt-5">
                <div className="text-sm font-medium">Accès à la structure</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(clinic.memberships || []).map((membership) => (
                    <span key={membership._id} className="rounded-full bg-black/5 px-3 py-1 text-xs text-muted">
                      {membership.userId?.fullName || membership.userId?.email || "Membre"} · {roleLabel(membership.role)}
                    </span>
                  ))}
                </div>
              </div>

              {clinic.canManage ? (
                <form className="mt-5 rounded-xl border border-border bg-black/2 p-4" onSubmit={(e) => addPractitioner(e, clinic)}>
                  <div className="font-medium">Ajouter un praticien existant</div>
                  <div className="mt-1 text-sm text-muted">
                    Le praticien doit d’abord avoir créé un compte PetLib avec le type « Praticien ».
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      className="flex-1 rounded-xl border border-border bg-white px-3 py-2"
                      placeholder="veterinaire@cabinet.fr"
                      value={emails[clinic._id] || ""}
                      onChange={(e) => setEmails((current) => ({ ...current, [clinic._id]: e.target.value }))}
                      required
                    />
                    <Button disabled={savingClinicId === clinic._id}>
                      {savingClinicId === clinic._id ? "Ajout…" : "Ajouter à l’équipe"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 text-sm text-muted">Tu peux consulter cette équipe mais pas modifier ses membres.</div>
              )}
            </Card>
          ))
        ) : (
          <Card className="p-6 text-sm text-muted">Aucune structure rattachée à ce compte professionnel.</Card>
        )}
      </div>
    </div>
  );
}
