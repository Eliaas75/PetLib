import React from "react";

export default function Tag({ children }) {
  return (
    <span className="inline-flex items-center h-7 px-2 rounded-lg bg-tagbg text-tagtext text-xs font-medium">
      {children}
    </span>
  );
}
