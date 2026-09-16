import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import Button from "../components/Button.jsx";
import { api } from "../lib/api.js";

const reasonOptions = [
  ["consult", "Consultation"],
  ["vaccine", "Vaccination"],
  ["surgery", "Chirurgie"],
  ["imaging", "Imagerie / Radio"],
  ["urgent", "Urgence"],
];

const consultationOptions = [
  ["clinic", "En clinique"],
  ["tele", "Téléconsultation"],
  ["home", "À domicile"],
  ["farm", "À la ferme"],
];

function requestedSpeciesMatches(petSpecies, querySpecies) {
  if (!querySpecies || querySpecies === "all" || querySpecies === "vet") return true;
  if (querySpecies === "nac") return ["rabbit", "bird", "reptile", "rodent", "ferret"].includes(petSpecies);
  if (querySpecies === "ferme") return petSpecies === "farm";
  if (querySpecies === "equide") return petSpecies === "equine";
  return petSpecies === querySpecies;
}

export default function WaitlistNew() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const requestedSpecies = params.get("species") || "";
  const preferredClinicId = params.get("clinicId") || "";
  const preferredPractitionerId = params.get("practitionerId") || "";

  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState("");
  const [reason, setReason] = useState(params.get("reason") || "consult");
  const [consultationType, setConsultationType] = useState(params.get("type") || "clinic");
  const [city, setCity] = useState(params.get("city") || "");
  const [postalCode, setPostalCode] = useState("");
  const [durationDays, setDurationDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api("/api/pets")
      .then((data) => {
        if (cancelled) return;
        const nextPets = data.pets || [];
        setPets(nextPets);
        const compatible = nextPets.find((pet) => requestedSpeciesMatches(pet.species, requestedSpecies));
        setPetId(compatible?._id || nextPets[0]?._id || "");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Impossible de charger tes animaux");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedSpecies]);

  const compatiblePets = useMemo(() => {
    const filtered = pets.filter((pet) => requestedSpeciesMatches(pet.species, requestedSpecies));
    return filtered.length ? filtered : pets;
  }, [pets, requestedSpecies]);

  async function submit(event) {
    event.preventDefault();
    if (!petId) return;

    setSubmitting(true);
    setError("");
    try {
      const expiresAt = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000);
      await api("/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          petId,
          reason,
          consultationTypes: consultationType ? [consultationType] : [],
          city: city.trim(),
          postalCode: postalCode.trim(),
          preferredClinicIds: preferredClinicId ? [preferredClinicId] : [],
          preferredPractitionerIds: preferredPractitionerId ? [preferredPractitionerId] : [],
          expiresAt: expiresAt.toISOString(),
        }),
      });
      nav("/account?waitlist=created", { replace: true });
    } catch (err) {
      setError(err.message || "Impossible de créer l'alerte");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[760px] mx-auto px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Smart Waitlist</h1>
        <p className="text-muted mt-2">
          Aucun créneau maintenant ? PetLib surveille les désistements compatibles et te réserve temporairement le créneau le temps que tu confirmes.
        </p>
      </div>

      <Card className="mt-6 p-6">
        {loading ? <div className="text-sm text-muted">Chargement de tes animaux…</div> : null}

        {!loading && pets.length === 0 ? (
          <div>
            <div className="font-semibold">Ajoute d'abord ton animal</div>
            <div className="text-sm text-muted mt-1">La Smart Waitlist doit connaître l'espèce pour proposer uniquement des créneaux compatibles.</div>
            <Link to="/account"><Button className="mt-4">Ajouter un animal</Button></Link>
          </div>
        ) : null}

        {!loading && pets.length > 0 ? (
          <form className="space-y-4" onSubmit={submit}>
            <Select label="Animal" value={petId} onChange={(e) => setPetId(e.target.value)}>
              {compatiblePets.map((pet) => (
                <option key={pet._id} value={pet._id}>{pet.name} — {pet.species}</option>
              ))}
            </Select>

            <Select label="Motif" value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasonOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>

            <Select label="Type de consultation" value={consultationType} onChange={(e) => setConsultationType(e.target.value)}>
              {consultationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris"
              />
              <Input
                label="Code postal (optionnel)"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="75011"
              />
            </div>

            <Select label="Durée de surveillance" value={durationDays} onChange={(e) => setDurationDays(e.target.value)}>
              <option value="1">24 heures</option>
              <option value="3">3 jours</option>
              <option value="7">7 jours</option>
              <option value="14">14 jours</option>
              <option value="30">30 jours</option>
            </Select>

            {preferredClinicId || preferredPractitionerId ? (
              <div className="rounded-xl bg-black/5 p-3 text-sm text-muted">
                Cette alerte est limitée au professionnel ou à l'établissement depuis lequel tu l'as créée.
              </div>
            ) : null}

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <Button className="w-full h-12" disabled={submitting || !petId}>
              {submitting ? "Création…" : "Activer la Smart Waitlist"}
            </Button>

            <div className="text-xs text-muted">
              Lorsqu'un créneau compatible se libère, PetLib le bloque temporairement pendant 5 minutes pour toi. Si tu ne confirmes pas, il est proposé au suivant.
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
