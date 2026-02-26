import React from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-white text-text border border-border hover:bg-black/2",
  ghost: "bg-transparent text-text hover:bg-black/5",
};

export default function Button({ variant = "primary", className = "", ...props }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
