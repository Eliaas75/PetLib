import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-muted">Chargement…</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}