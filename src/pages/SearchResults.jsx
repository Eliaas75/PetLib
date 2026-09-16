import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import Chip from "../components/Chip.jsx";
import Select from "../components/Select.jsx";
import Button from "../components/Button.jsx";
import PractitionerCard from "../components/PractitionerCard.jsx";
import { api } from "../lib/api.js";

const speciesLabels = {
  all: "Tous les animaux",
  dog: "Chien",
  cat: "Chat",
  nac: "NAC",
  rabbit: "Lapin",
  bird: "Oiseau",
  reptile: "Reptile",
  rodent: "Rongeur",
  ferret: "Furet",
  equine: "Équidé",
  equide: "Équidé",
  farm: "Animaux de ferme",
  ferme: "Animaux de ferme",
};

export default function SearchResults() {
  const [params] = useSearchParams();
  const paramsKey = params.toString();
  const city = params.get("city") || "Paris";
  const species = params.get("species") || "all";
  const urgent = params.get("urgent") === "1";
  const reason = params.get("reason") || (urgent ? "urgent" : "consult");

  const [availabilityDays, setAvailabilityDays] = useState("7");
  const [consultationType, setConsultationType] = useState(params.get("type") || "clinic");
  const [sort, setSort] = useState("availability");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setConsultationType(params.get("type") || "clinic");
  }, [paramsKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (city) query.set("city", city);
      if (species && species !== "all") query.set("species", species);
      if (reason) query.set("reason", reason);
      if (consultationType) query.set("consultationType", consultationType);
      query.set("availabilityDays", availabilityDays);
      if (urgent) query.set("emergency", "true");

      try {
        const data = await api(`/api/search?${query.toString()}`);
        if (!cancelled) setResults(data.results || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Impossible de charger les résultats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [paramsKey, city, species, reason, urgent, availabilityDays, consultationType, reloadKey]);

  const sortedResults = useMemo(() => {
    const list = [...results];
    if (sort === "rating") {
      list.sort((a, b) => Number(b.practitioner?.rating || 0) - Number(a.practitioner?.rating || 0));
    }
    return list;
  }, [results, sort]);

  const hasAvailableSlots = sortedResults.some((result) => (result.nextSlots || []).length > 0);
  const waitlistQuery = new URLSearchParams({ city, species, reason });
  if (consultationType) waitlistQuery.set("type", consultationType);
  const waitlistUrl = `/waitlist/new?${waitlistQuery.toString()}`;

  const resetFilters = () => {
    setAvailabilityDays("7");
    setConsultationType("clinic");
    setSort("availability");
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-20 py-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-3">
          <Card className="p-4 lg:sticky lg:top-[96px]">
            <div className="text-lg font-semibold">Filtres</div>

            <div className="mt-4">
              <div className="text-sm font-semibold">Disponibilité</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip selected={availabilityDays === "1"} onClick={() => setAvailabilityDays("1")}>Aujourd'hui</Chip>
                <Chip selected={availabilityDays === "2"} onClick={() => setAvailabilityDays("2")}>48 h</Chip>
                <Chip selected={availabilityDays === "7"} onClick={() => setAvailabilityDays("7")}>7 jours</Chip>
              </div>
            </div>

            <div className="mt-5">
              <Select
                label="Type de consultation"
                value={consultationType}
                onChange={(event) => setConsultationType(event.target.value)}
              >
                <option value="">Tous</option>
                <option value="clinic">En clinique</option>
                <option value="tele">Téléconsultation</option>
                <option value="home">À domicile</option>
                <option value="farm">À la ferme</option>
              </Select>
            </div>

            <div className="mt-5 text-xs text-muted">
              Les résultats et créneaux viennent directement de l'API PetLib.
            </div>

            <Button className="w-full mt-5" variant="secondary" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold">
                {speciesLabels[species] || species} — {city}
              </div>
              <div className="text-sm text-muted mt-1">
                {loading ? "Recherche des disponibilités…" : `${sortedResults.length} praticien${sortedResults.length > 1 ? "s" : ""}`}
              </div>
            </div>

            <div className="w-full sm:w-[220px]">
              <Select label="Tri" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="availability">Prochain créneau</option>
                <option value="rating">Meilleure note</option>
              </Select>
            </div>
          </div>

          {error ? (
            <Card className="mt-4 p-5">
              <div className="font-semibold">Impossible de charger les résultats</div>
              <div className="text-sm text-muted mt-1">{error}</div>
              <Button className="mt-4" onClick={() => setReloadKey((value) => value + 1)}>Réessayer</Button>
            </Card>
          ) : null}

          {!error && loading ? (
            <Card className="mt-4 p-6 text-sm text-muted">Chargement des praticiens et créneaux…</Card>
          ) : null}

          {!error && !loading && !hasAvailableSlots ? (
            <Card className="mt-4 p-6">
              {urgent ? (
                <>
                  <div className="font-semibold">Aucun créneau d'urgence affiché actuellement</div>
                  <div className="text-sm text-muted mt-1">
                    Si l'état de ton animal nécessite une prise en charge immédiate, contacte directement un établissement vétérinaire d'urgence ou de garde plutôt que d'attendre une alerte.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Aucun créneau compatible actuellement</div>
                  <div className="text-sm text-muted mt-1">
                    Active la Smart Waitlist : lorsqu'un désistement compatible apparaît, PetLib bloque temporairement le créneau pour te laisser le temps de confirmer.
                  </div>
                  <Link to={waitlistUrl}>
                    <Button className="mt-4">🔔 Activer la Smart Waitlist</Button>
                  </Link>
                </>
              )}
            </Card>
          ) : null}

          {!error && !loading && sortedResults.length > 0 ? (
            <div className="mt-4 space-y-4">
              {sortedResults.map((result) => (
                <PractitionerCard key={result.practitioner._id} result={result} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
