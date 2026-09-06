"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Appearance = "system" | "light" | "dark";
type AppearanceContextValue = {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
};
const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const storageKey = "lifemate-command-center-appearance";

function applyAppearance(appearance: Appearance) {
  const resolved =
    appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : appearance === "system"
        ? "light"
        : appearance;
  document.documentElement.dataset.appearance = appearance;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem(storageKey);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });
  useEffect(() => {
    applyAppearance(appearance);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => appearance === "system" && applyAppearance("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance]);
  const value = useMemo(
    () => ({
      appearance,
      setAppearance: (next: Appearance) => {
        window.localStorage.setItem(storageKey, next);
        setAppearanceState(next);
        applyAppearance(next);
      },
    }),
    [appearance],
  );
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("AppearanceProvider is required.");
  return value;
}

export function AppearanceBootstrap() {
  const script = `(()=>{try{const v=localStorage.getItem('${storageKey}'),a=v==='light'||v==='dark'||v==='system'?v:'system',t=a==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):a,e=document.documentElement;e.dataset.appearance=a;e.dataset.theme=t;e.style.colorScheme=t}catch{}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
