import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

const professionalRoles = new Set(["practitioner", "clinic_admin", "admin"]);

export default function ProRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-6 text-muted">Chargement de l’espace professionnel…</div>;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (!professionalRoles.has(user.role)) return <Navigate to="/account" replace />;

  return (
    <>
      {location.pathname === "/pro" ? (
        <div className="max-w-[1200px] mx-auto px-6 lg:px-20 pt-6 flex flex-wrap gap-2">
          <Link to="/pro/agenda" className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-black/2">Ouvrir l’agenda</Link>
          <Link to="/pro/disponibilites" className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-black/2">Gérer les disponibilités</Link>
        </div>
      ) : null}
      {children}
    </>
  );
}
