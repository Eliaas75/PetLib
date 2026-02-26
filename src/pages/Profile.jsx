import React, { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import Tag from "../components/Tag.jsx";
import Button from "../components/Button.jsx";
import Select from "../components/Select.jsx";
import Chip from "../components/Chip.jsx";
import { practitioners } from "../data/practitioners.js";

const tabList = ["Infos", "Actes", "Tarifs", "Avis", "Accès"];
const types = [
  { k: "clinic", label: "Clinique" },
  { k: "tele", label: "Téléconsult" },
  { k: "home", label: "Domicile" },
];

export default function Profile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const autoBook = params.get("book") === "1";

  const p = useMemo(() => practitioners.find((x) => x.id === id) || practitioners[0], [id]);

  const [tab, setTab] = useState("Infos");
  const [animal, setAnimal] = useState("Ajouter / Choisir un animal");
  const [motif, setMotif] = useState("Consultation NAC");
  const [type, setType] = useState("clinic");
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState(p.slots?.[day]?.[0] || "");

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-20 py-6">
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">{p.name}</div>
            <div className="text-sm text-muted mt-1">{p.subtitle}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.tags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
            <div className="mt-3 text-sm text-muted">
              ★ {p.rating} ({p.reviews} avis) • {p.address} • {p.distance}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="w-full sm:w-[200px]" onClick={() => alert("Flow booking à brancher")}>
              Prendre rendez-vous
            </Button>
            <Button variant="secondary" className="w-full sm:w-[200px]" onClick={() => alert("Messaging à brancher")}>
              Envoyer un message
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <div className="flex flex-wrap gap-2">
            {tabList.map((t) => (
              <Chip key={t} selected={tab === t} onClick={() => setTab(t)}>
                {t}
              </Chip>
            ))}
          </div>

          <Card className="p-5">
            <div className="text-lg font-semibold">{tab}</div>

            {tab === "Infos" && (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <div className="font-semibold">Horaires</div>
                  <div className="text-muted mt-1">
                    Lun–Ven 09:00–18:30 • Sam 09:00–12:00 • Dim fermé
                  </div>
                </div>
                <div>
                  <div className="font-semibold">Équipements</div>
                  <div className="text-muted mt-1">
                    Imagerie, laboratoire, hospitalisation courte, consultation spécialisée NAC.
                  </div>
                </div>
              </div>
            )}

            {tab === "Actes" && (
              <div className="mt-3 space-y-2 text-sm">
                {p.acts.map((a) => (
                  <div key={a.name} className="flex items-center justify-between border-b border-border py-2">
                    <div>{a.name}</div>
                    <div className="text-muted">{a.price}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === "Tarifs" && (
              <div className="mt-3 text-sm text-muted">
                Tarifs indicatifs selon espèce / complexité. Paiement CB / espèces. Assurance animale selon contrat.
              </div>
            )}

            {tab === "Avis" && (
              <div className="mt-3 text-sm text-muted">
                (Prototype) Ici tu affiches une liste d’avis + filtres.
              </div>
            )}

            {tab === "Accès" && (
              <div className="mt-3 text-sm text-muted">
                (Prototype) Carte + instructions d’accès, stationnement, etc.
              </div>
            )}
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <Card className={`p-4 lg:sticky lg:top-[96px] ${autoBook ? "ring-2 ring-brand/25" : ""}`}>
            <div className="text-lg font-semibold">Choisir un créneau</div>

            <div className="mt-3 space-y-3">
              <Select label="Animal" value={animal} onChange={(e) => setAnimal(e.target.value)}>
                <option>Ajouter / Choisir un animal</option>
                <option>Kiwi — Perroquet</option>
                <option>Noodle — Serpent</option>
                <option>Plume — Lapin</option>
              </Select>

              <Select label="Motif" value={motif} onChange={(e) => setMotif(e.target.value)}>
                <option>Consultation NAC</option>
                <option>Consultation reptile</option>
                <option>Vaccin</option>
                <option>Imagerie / Radio</option>
                <option>Urgence</option>
              </Select>

              <div>
                <div className="mb-1 text-xs text-muted">Type</div>
                <div className="grid grid-cols-3 gap-2">
                  {types.map((t) => (
                    <button
                      key={t.k}
                      type="button"
                      onClick={() => setType(t.k)}
                      className={[
                        "h-10 rounded-xl border text-sm transition",
                        type === t.k
                          ? "bg-brand text-white border-brand"
                          : "bg-white border-border hover:bg-black/2",
                      ].join(" ")}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs text-muted">Jour</div>
                <div className="flex flex-wrap gap-2">
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, idx) => (
                    <Chip
                      key={d}
                      selected={day === idx}
                      onClick={() => {
                        setDay(idx);
                        const nextSlot = p.slots?.[idx]?.[0] || "";
                        setSlot(nextSlot);
                      }}
                    >
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs text-muted">Créneaux</div>
                <div className="grid grid-cols-3 gap-2">
                  {(p.slots?.[day] || []).slice(0, 9).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={[
                        "h-10 rounded-xl border text-sm transition",
                        slot === s
                          ? "bg-brand text-white border-brand"
                          : "bg-white border-border hover:bg-black/2",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full h-12"
                onClick={() => alert(`RDV: ${animal} • ${motif} • ${type} • ${slot}`)}
                disabled={!slot || slot === "—"}
              >
                Continuer
              </Button>

              <div className="text-xs text-muted">
                Vous recevrez un SMS de confirmation et les consignes de préparation.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
