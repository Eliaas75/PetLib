import React from "react";
import { Link } from "react-router-dom";
import Card from "./Card.jsx";
import Tag from "./Tag.jsx";
import Button from "./Button.jsx";

function formatSlot(dateValue) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function PractitionerCard({ result }) {
  const practitioner = result.practitioner;
  const clinic = result.clinics?.[0];
  const slots = result.nextSlots || [];

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        <div className="w-20 shrink-0">
          <div className="h-20 w-20 rounded-xl2 bg-black/5 border border-border flex items-center justify-center text-2xl">
            🩺
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold truncate">{practitioner.displayName}</div>
              <div className="text-sm text-muted">{practitioner.title || "Vétérinaire"}</div>

              <div className="mt-2 flex flex-wrap gap-2">
                {(practitioner.specialties || []).slice(0, 5).map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>

              {clinic ? (
                <div className="mt-2 text-sm text-muted">
                  {clinic.name} • {[clinic.address?.postalCode, clinic.address?.city].filter(Boolean).join(" ")}
                </div>
              ) : null}

              <div className="mt-1 text-sm text-muted">
                {practitioner.reviewsCount > 0
                  ? `★ ${Number(practitioner.rating || 0).toFixed(1)} (${practitioner.reviewsCount} avis)`
                  : "Nouveau praticien"}
              </div>
            </div>

            <div className="md:w-[390px]">
              <div className="text-xs text-muted mb-2">Prochains créneaux</div>
              {slots.length ? (
                <div className="flex flex-wrap gap-2">
                  {slots.slice(0, 3).map((slot) => (
                    <span
                      key={slot._id}
                      className="min-h-9 px-3 rounded-xl border border-border bg-white text-sm inline-flex items-center"
                    >
                      {formatSlot(slot.startsAt)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted rounded-xl border border-dashed border-border p-3">
                  Aucun créneau sur cette période.
                </div>
              )}

              <div className="mt-3 flex gap-2 md:justify-end">
                <Link className="flex-1 md:flex-none" to={`/p/${practitioner._id}`}>
                  <Button className="w-full" variant="secondary">Voir profil</Button>
                </Link>
                <Link className="flex-1 md:flex-none" to={`/p/${practitioner._id}?book=1`}>
                  <Button className="w-full">Choisir</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
