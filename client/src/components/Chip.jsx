import React from "react";

export default function Chip({ selected, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "h-9 px-3 rounded-xl text-sm border transition",
        selected
          ? "bg-brand text-white border-brand"
          : "bg-white text-text border-border hover:bg-black/2",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}
