import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import Card from "../components/Card.jsx";
import Tag from "../components/Tag.jsx";
import ProNav from "../components/ProNav.jsx";

function percent(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function shortDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(year, month - 1, day));
}

export default function ProStats() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const stats = await api(`/api/pro/stats?days=${days}`);
      setData(stats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [days]);

  const metrics = data?.metrics || {};
  const daily = data?.daily || [];
  const maxDaily = useMemo(() => Math.max(1, ...daily.map((item) => item.total || 0)), [daily]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <ProNav />

      <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <Tag>Statistiques</Tag>
          <h1 className="mt-3 text-3xl font-semibold">Mesurer l’activité utile de PetLib</h1>
          <p className="mt-1 text-muted">Occupation, annulations, réservations directes et créneaux récupérés grâce à la Smart Waitlist.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90, 365].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              className={[
                "rounded-xl border px-4 py-2 text-sm font-medium",
                days === value ? "border-brand bg-brand text-white" : "border-border bg-white hover:bg-black/2",
              ].join(" ")}
            >
              {value === 365 ? "1 an" : `${value} jours`}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="mt-6 text-sm text-muted">Chargement des statistiques…</div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Rendez-vous", metrics.totalAppointments ?? 0, "sur la période"],
              ["Taux d’occupation", percent(metrics.occupancyRate), `${metrics.bookedSlots ?? 0} créneaux réservés`],
              ["Smart Waitlist", metrics.waitlistAppointments ?? 0, `${percent(metrics.waitlistShare)} des réservations actives`],
              ["Annulations", metrics.cancelledAppointments ?? 0, percent(metrics.cancellationRate)],
            ].map(([label, value, hint]) => (
              <Card key={label} className="p-5">
                <div className="text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-sm font-medium">{label}</div>
                <div className="mt-1 text-xs text-muted">{hint}</div>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
            <Card className="p-6">
              <div>
                <h2 className="text-lg font-semibold">Rendez-vous par jour</h2>
                <p className="text-sm text-muted">Les barres foncées représentent l’activité totale ; la partie annotée indique les rendez-vous issus de la Waitlist.</p>
              </div>

              <div className="mt-5 space-y-3">
                {daily.length ? daily.map((item) => (
                  <div key={item.date} className="grid grid-cols-[72px_1fr_76px] items-center gap-3">
                    <div className="text-xs text-muted">{shortDate(item.date)}</div>
                    <div className="h-8 rounded-lg bg-black/5 overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-black/75 flex items-center justify-end px-2 text-[11px] text-white"
                        style={{ width: `${Math.max(item.total ? 10 : 0, (item.total / maxDaily) * 100)}%` }}
                      >
                        {item.total || ""}
                      </div>
                    </div>
                    <div className="text-xs text-right text-muted">{item.waitlist ? `${item.waitlist} waitlist` : "—"}</div>
                  </div>
                )) : (
                  <div className="py-8 text-center text-sm text-muted">Pas encore d’activité sur cette période.</div>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold">Répartition des rendez-vous</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    ["Confirmés", metrics.confirmedAppointments ?? 0],
                    ["Terminés", metrics.completedAppointments ?? 0],
                    ["Annulés", metrics.cancelledAppointments ?? 0],
                    ["Absents", metrics.noShowAppointments ?? 0],
                    ["Réservations directes", metrics.directAppointments ?? 0],
                    ["Smart Waitlist", metrics.waitlistAppointments ?? 0],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                      <span className="text-muted">{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold">Qualité du planning</h2>
                <div className="mt-4 space-y-3">
                  <div><div className="flex justify-between text-sm"><span className="text-muted">Occupation</span><strong>{percent(metrics.occupancyRate)}</strong></div><div className="mt-2 h-2 rounded-full bg-black/5"><div className="h-full rounded-full bg-black/70" style={{ width: `${Math.min(100, metrics.occupancyRate || 0)}%` }} /></div></div>
                  <div><div className="flex justify-between text-sm"><span className="text-muted">Annulations</span><strong>{percent(metrics.cancellationRate)}</strong></div><div className="mt-2 h-2 rounded-full bg-black/5"><div className="h-full rounded-full bg-black/70" style={{ width: `${Math.min(100, metrics.cancellationRate || 0)}%` }} /></div></div>
                  <div><div className="flex justify-between text-sm"><span className="text-muted">Absences</span><strong>{percent(metrics.noShowRate)}</strong></div><div className="mt-2 h-2 rounded-full bg-black/5"><div className="h-full rounded-full bg-black/70" style={{ width: `${Math.min(100, metrics.noShowRate || 0)}%` }} /></div></div>
                </div>
              </Card>

              <Card className="p-6 border-brand/30">
                <div className="text-sm font-semibold">Impact Smart Waitlist</div>
                <div className="mt-2 text-3xl font-semibold">{metrics.waitlistAppointments ?? 0}</div>
                <p className="mt-1 text-sm text-muted">rendez-vous non annulés sur la période ont été obtenus via un créneau proposé par la Smart Waitlist.</p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
