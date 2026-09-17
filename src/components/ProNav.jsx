import React from "react";
import { NavLink } from "react-router-dom";

const items = [
  ["/pro", "Tableau de bord", true],
  ["/pro/agenda", "Agenda", false],
  ["/pro/disponibilites", "Disponibilités", false],
  ["/pro/profil", "Profil", false],
];

export default function ProNav() {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navigation professionnelle">
      {items.map(([to, label, end]) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => [
            "rounded-xl border px-4 py-2 text-sm font-medium transition",
            isActive ? "border-brand bg-brand text-white" : "border-border bg-white text-text hover:bg-black/2",
          ].join(" ")}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
