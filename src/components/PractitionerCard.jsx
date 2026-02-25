import React, { useState } from "react";
import { Link } from "react-router-dom";
import Card from "./Card.jsx";
import Tag from "./Tag.jsx";
import Button from "./Button.jsx";
import CalendarMini from "./CalendarMini.jsx";

export default function PractitionerCard({ p }) {
  const [day, setDay] = useState(1);

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        <div className="w-20">
          <div className="h-20 w-20 rounded-xl2 bg-black/5 border border-border" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold truncate">{p.name}</div>
              <div className="text-sm text-muted">{p.subtitle}</div>

              <div className="mt-2 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>

              <div className="mt-2 text-sm text-muted">
                {p.address} • {p.distance}
              </div>
              <div className="mt-1 text-sm text-muted">
                ★ {p.rating} ({p.reviews} avis)
              </div>
            </div>

            <div className="hidden md:block w-[360px]">
              <div className="text-xs text-muted mb-2">Créneaux rapides</div>
              <CalendarMini selectedDay={day} onDay={setDay} />
              <div className="mt-2 flex flex-wrap gap-2">
                {p.slots[day]?.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="h-9 px-3 rounded-xl border border-border bg-white text-sm inline-flex items-center"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex gap-2 justify-end">
                <Link to={`/p/${p.id}`}>
                  <Button variant="ghost">Voir profil</Button>
                </Link>
                <Link to={`/p/${p.id}?book=1`}>
                  <Button>Choisir</Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="md:hidden mt-3 flex gap-2">
            <Link className="flex-1" to={`/p/${p.id}`}>
              <Button className="w-full" variant="secondary">Voir profil</Button>
            </Link>
            <Link className="flex-1" to={`/p/${p.id}?book=1`}>
              <Button className="w-full">Choisir</Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
