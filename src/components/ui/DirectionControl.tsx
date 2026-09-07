"use client";

import { useDirection } from "./DirectionProvider";

export function DirectionControl() {
  const { direction, setDirection } = useDirection();
  return (
    <div className="direction-control" role="group" aria-label="جهت محیط">
      <button
        type="button"
        data-active={direction === "rtl"}
        aria-pressed={direction === "rtl"}
        onClick={() => setDirection("rtl")}
      >
        فا
      </button>
      <button
        type="button"
        data-active={direction === "ltr"}
        aria-pressed={direction === "ltr"}
        onClick={() => setDirection("ltr")}
      >
        EN
      </button>
    </div>
  );
}
