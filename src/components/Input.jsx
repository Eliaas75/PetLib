import React from "react";

export default function Input({ label, className = "", ...props }) {
  return (
    <label className="block w-full">
      {label ? <div className="mb-1 text-xs text-muted">{label}</div> : null}
      <input
        className={`w-full h-12 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand/25 ${className}`}
        {...props}
      />
    </label>
  );
}
