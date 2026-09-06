"use client";

import { type Appearance, useAppearance } from "./AppearanceProvider";

const choices: { value: Appearance; label: string }[] = [
  { value: "system", label: "سیستم" },
  { value: "light", label: "روشن" },
  { value: "dark", label: "تیره" },
];

export function AppearanceControl() {
  const { appearance, setAppearance } = useAppearance();
  return (
    <details className="appearance-control">
      <summary aria-label="نمای ظاهری">
        ◐<span className="sr-only">نمای ظاهری</span>
      </summary>
      <div className="appearance-control__menu" role="group" aria-label="انتخاب نمای ظاهری">
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            data-active={appearance === choice.value}
            onClick={() => setAppearance(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </details>
  );
}
