import type { ReactNode } from "react";

import { Sidebar } from "@/src/components/shell/Sidebar";
import { Topbar } from "@/src/components/shell/Topbar";
import { AppShell } from "@/src/components/ui/AppShell";

type AdminShellProps = {
  activeSlug: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AdminShell({ activeSlug, title, subtitle, children }: AdminShellProps) {
  return (
    <AppShell
      sidebar={
        <>
          <a className="skip-link" href="#main-content">
            رفتن به محتوای اصلی
          </a>
          <Sidebar activeSlug={activeSlug} />
        </>
      }
      header={<Topbar title={title} subtitle={subtitle} />}
    >
      <main id="main-content" className="main-content" tabIndex={-1}>
        {children}
      </main>
    </AppShell>
  );
}
