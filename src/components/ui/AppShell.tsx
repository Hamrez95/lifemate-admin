import type { ReactNode } from "react";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div className="app-shell">
      {sidebar}
      <div className="app-shell__content">
        {header}
        {children}
      </div>
    </div>
  );
}
