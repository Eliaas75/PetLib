import React from "react";
import Chip from "./Chip.jsx";

const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarMini({ selectedDay = 1, onDay }) {
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((d, idx) => (
        <Chip key={d} selected={idx === selectedDay} onClick={() => onDay?.(idx)}>
          {d}
        </Chip>
      ))}
    </div>
  );
}
