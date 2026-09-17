import React from "react";
import { Navigate, useLocation } from "react-router-dom";
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

  return children;
}
