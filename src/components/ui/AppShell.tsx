"use client";

import type { ReactNode } from "react";

import { useDirection } from "./DirectionProvider";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, header, children }: AppShellProps) {
  const { direction } = useDirection();
  return (
    <div className="app-shell" data-direction={direction}>
      {sidebar}
      <div className="app-shell__content">
        {header}
        {children}
      </div>
    </div>
  );
}
