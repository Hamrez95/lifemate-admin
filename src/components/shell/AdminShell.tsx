import type { ReactNode } from "react";

import { Sidebar } from "@/src/components/shell/Sidebar";
import { Topbar } from "@/src/components/shell/Topbar";

type AdminShellProps = {
  activeSlug: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AdminShell({ activeSlug, title, subtitle, children }: AdminShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <Sidebar activeSlug={activeSlug} />
      <div className="app-shell__content">
        <Topbar title={title} subtitle={subtitle} />
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
