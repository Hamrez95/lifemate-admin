"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type Direction = "rtl" | "ltr";

const storageKey = "lifemate-command-center-direction";
const DirectionContext = createContext<{
  direction: Direction;
  setDirection: (value: Direction) => void;
} | null>(null);

function applyDirection(direction: Direction) {
  document.documentElement.dir = direction;
  document.documentElement.lang = direction === "rtl" ? "fa" : "en";
  document.documentElement.dataset.direction = direction;
}

export function DirectionBootstrap() {
  const script = `(()=>{try{const v=localStorage.getItem('${storageKey}'),d=v==='ltr'?'ltr':'rtl',e=document.documentElement;e.dir=d;e.lang=d==='rtl'?'fa':'en';e.dataset.direction=d}catch{}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function DirectionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirectionState] = useState<Direction>(() => {
    if (typeof window === "undefined") return "rtl";
    return window.localStorage.getItem(storageKey) === "ltr" ? "ltr" : "rtl";
  });

  const setDirection = (value: Direction) => {
    window.localStorage.setItem(storageKey, value);
    applyDirection(value);
    setDirectionState(value);
  };

  return (
    <DirectionContext.Provider value={{ direction, setDirection }}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection() {
  const context = useContext(DirectionContext);
  if (!context) throw new Error("useDirection must be used inside DirectionProvider.");
  return context;
}
