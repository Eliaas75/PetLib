import React from "react";

export default function Select({ label, className = "", children, ...props }) {
  return (
    <label className="block w-full">
      {label ? <div className="mb-1 text-xs text-muted">{label}</div> : null}
      <select
        className={`w-full h-12 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand/25 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
