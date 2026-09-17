import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import Card from "../components/Card.jsx";
import Tag from "../components/Tag.jsx";
import ProNav from "../components/ProNav.jsx";

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function boundsForDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const from = new Date(year, month - 1, day, 0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatTime(value) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function statusLabel(status) {
  return {
    pending: "En attente",
    confirmed: "Confirmé",
    cancelled: "Annulé",
    completed: "Terminé",
    no_show: "Absent",
  }[status] || status;
}

function actionLabel(status) {
  return {
    confirmed: "Confirmer",
    completed: "Terminer",
    no_show: "Marquer absent",
  }[status] || status;
}

export default function ProAgenda() {
  const [selectedDate, setSelectedDate] = useState(dateInputValue(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mutatingId, setMutatingId] = useState("");

  async function loadAppointments() {
    setLoading(true);
    setError("");
    try {
      const { from, to } = boundsForDate(selectedDate);
      const data = await api(`/api/pro/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=250`);
      setAppointments(data.appointments || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  const visibleAppointments = useMemo(() => {
    if (filter === "all") return appointments;
    if (filter === "active") return appointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status));
    return appointments.filter((appointment) => appointment.status === filter);
  }, [appointments, filter]);

  function moveDay(delta) {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + delta);
    setSelectedDate(dateInputValue(date));
  }

  async function updateStatus(appointment, status) {
    setMutatingId(appointment._id);
    setError("");
    setSuccess("");
    try {
      await api(`/api/pro/appointments/${appointment._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSuccess(`Rendez-vous mis à jour : ${statusLabel(status)}.`);
      await loadAppointments();
    } catch (e) {
      setError(e.message);
    } finally {
      setMutatingId("");
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <ProNav />

      <div className="mt-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <Tag>Agenda professionnel</Tag>
          <h1 className="mt-3 text-3xl font-semibold">Rendez-vous de la journée</h1>
          <p className="mt-1 text-muted">Consulte les patients attendus, confirme les rendez-vous et clôture les consultations terminées.</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => moveDay(-1)} className="rounded-xl border border-border px-3 py-2">←</button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-xl border border-border px-3 py-2" />
          <button type="button" onClick={() => moveDay(1)} className="rounded-xl border border-border px-3 py-2">→</button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["active", "Actifs"],
          ["all", "Tous"],
          ["confirmed", "Confirmés"],
          ["pending", "En attente"],
          ["completed", "Terminés"],
          ["no_show", "Absents"],
          ["cancelled", "Annulés"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={[
              "rounded-xl border px-4 py-2 text-sm",
              filter === value ? "border-brand bg-brand text-white" : "border-border bg-white",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

      <Card className="mt-5 p-5">
        {loading ? (
          <div className="text-sm text-muted">Chargement de l’agenda…</div>
        ) : visibleAppointments.length ? (
          <div className="divide-y divide-border">
            {visibleAppointments.map((appointment) => {
              const hasStarted = new Date(appointment.startsAt) <= new Date();
              const busy = mutatingId === appointment._id;
              return (
                <div key={appointment._id} className="py-4 first:pt-0 last:pb-0 grid grid-cols-[70px_1fr] lg:grid-cols-[80px_1fr_auto] gap-4 items-start lg:items-center">
                  <div className="text-lg font-semibold">{formatTime(appointment.startsAt)}</div>
                  <div>
                    <div className="font-medium">{appointment.petId?.name || "Animal"} · {appointment.reason}</div>
                    <div className="mt-1 text-sm text-muted">
                      {appointment.petId?.species || "Espèce non précisée"}
                      {appointment.petId?.breed ? ` · ${appointment.petId.breed}` : ""}
                      {appointment.clinicId?.name ? ` · ${appointment.clinicId.name}` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-black/5 px-2 py-1">{statusLabel(appointment.status)}</span>
                      <span className="rounded-full bg-black/5 px-2 py-1">{appointment.consultationType}</span>
                      {appointment.source === "waitlist" ? <span className="rounded-full bg-brand/10 text-brand px-2 py-1">Smart Waitlist</span> : null}
                    </div>
                    {appointment.ownerNotes ? <div className="mt-2 text-sm text-muted">Note propriétaire : {appointment.ownerNotes}</div> : null}

                    {["pending", "confirmed"].includes(appointment.status) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {appointment.status === "pending" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => updateStatus(appointment, "confirmed")}
                            className="rounded-xl border border-brand px-3 py-2 text-xs font-medium text-brand hover:bg-brand/5 disabled:opacity-50"
                          >
                            {actionLabel("confirmed")}
                          </button>
                        ) : null}
                        {hasStarted ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => updateStatus(appointment, "completed")}
                              className="rounded-xl border border-green-300 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                            >
                              {actionLabel("completed")}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => updateStatus(appointment, "no_show")}
                              className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted hover:bg-black/2 disabled:opacity-50"
                            >
                              {actionLabel("no_show")}
                            </button>
                          </>
                        ) : (
                          <span className="self-center text-xs text-muted">Clôture disponible après le début du rendez-vous.</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted lg:text-right">jusqu’à {formatTime(appointment.endsAt)}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted">Aucun rendez-vous pour cette journée avec ce filtre.</div>
        )}
      </Card>
    </div>
  );
}
