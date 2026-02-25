import React from "react";

export default function Card({ className = "", children }) {
  return (
    <div className={`bg-surface border border-border shadow-soft rounded-xl2 ${className}`}>
      {children}
    </div>
  );
}
