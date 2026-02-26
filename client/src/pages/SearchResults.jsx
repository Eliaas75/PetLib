import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import Chip from "../components/Chip.jsx";
import Select from "../components/Select.jsx";
import Button from "../components/Button.jsx";
import PractitionerCard from "../components/PractitionerCard.jsx";
import { practitioners } from "../data/practitioners.js";

export default function SearchResults() {
  const [params] = useSearchParams();
  const city = params.get("city") || "Paris";
  const species = params.get("species") || "nac";

  const [availability, setAvailability] = useState("7");
  const [type, setType] = useState({ clinic: true, tele: false, home: false, farm: false });
  const [distance, setDistance] = useState(10);
  const [sort, setSort] = useState("relevance");

  const filtered = useMemo(() => {
    let list = [...practitioners];
    if (species === "nac") list = list.filter((p) => p.tags.includes("NAC"));
    if (species === "ferme") list = list.filter((p) => p.tags.includes("Ferme") || p.tags.includes("À la ferme"));
    if (species === "all") list = practitioners;
    if (sort === "rating") list.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    return list;
  }, [species, sort]);

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-20 py-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-3">
          <Card className="p-4 lg:sticky lg:top-[96px]">
            <div className="text-lg font-semibold">Filtres</div>

            <div className="mt-4">
              <div className="text-sm font-semibold">Disponibilité</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip selected={availability === "0"} onClick={() => setAvailability("0")}>Aujourd’hui</Chip>
                <Chip selected={availability === "1"} onClick={() => setAvailability("1")}>Demain</Chip>
                <Chip selected={availability === "7"} onClick={() => setAvailability("7")}>7 jours</Chip>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold">Type de consultation</div>
              <div className="mt-2 space-y-2 text-sm">
                {[
                  ["clinic", "Clinique"],
                  ["tele", "Téléconsultation"],
                  ["home", "À domicile"],
                  ["farm", "À la ferme"],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={type[k]}
                      onChange={(e) => setType((t) => ({ ...t, [k]: e.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold">Distance</div>
              <div className="mt-2">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={distance}
                  onChange={(e) => setDistance(parseInt(e.target.value, 10))}
                  className="w-full"
                />
                <div className="mt-1 text-sm text-muted">{distance} km</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => alert("Reset à brancher")}>
                Réinitialiser
              </Button>
              <Button onClick={() => alert("Appliquer à brancher")}>Appliquer</Button>
            </div>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold">{species.toUpperCase()} — {city}</div>
              <div className="text-sm text-muted mt-1">
                {filtered.length} résultats
              </div>
            </div>

            <div className="w-[220px]">
              <Select label="Tri" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Pertinence</option>
                <option value="rating">Meilleure note</option>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {filtered.map((p) => (
              <PractitionerCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
