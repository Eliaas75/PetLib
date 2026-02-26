import React from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "./Button.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Header() {
  const nav = useNavigate();
  const { user, loading, logout } = useAuth();

  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-border">
      <div className="h-[72px] max-w-[1440px] mx-auto px-6 lg:px-20 flex items-center gap-6">
        <Link to="/" className="text-xl font-semibold text-brand">
          Petlib
        </Link>

        <div className="hidden lg:flex items-center gap-4 text-sm text-muted">
          <Link to="/search?species=vet" className="hover:text-text">Vétérinaires</Link>
          <Link to="/search?species=nac" className="hover:text-text">NAC</Link>
          <Link to="/search?species=ferme" className="hover:text-text">Ferme</Link>
          <Link to="/search?urgent=1" className="hover:text-text">Urgences</Link>
          <span className="hover:text-text cursor-pointer">Conseils</span>
        </div>

        <div className="flex-1" />

        <button
          className="hidden md:flex items-center w-[520px] h-10 rounded-xl border border-border px-3 text-sm text-muted hover:bg-black/2"
          onClick={() => nav("/search")}
          type="button"
          aria-label="Mini recherche"
        >
          Rechercher un praticien, une clinique…
        </button>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link
                to="/account"
                className="hidden sm:inline-flex text-sm font-medium text-text hover:underline"
              >
                Mon compte
              </Link>

              <div className="hidden sm:block text-sm text-muted max-w-[220px] truncate">
                {user.fullName ? user.fullName : user.email}
              </div>

              <Button variant="secondary" onClick={() => logout().catch(() => {})}>
                Se déconnecter
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="secondary">Se connecter</Button>
              </Link>
              <Link to="/register" className="hidden sm:inline-flex">
                <Button>Créer un compte</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}