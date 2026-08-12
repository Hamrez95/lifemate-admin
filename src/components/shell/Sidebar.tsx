import Link from "next/link";

import { LifeMateLogo } from "@/src/components/brand/LifeMateLogo";
import { workspaceHref, workspaces } from "@/src/config/workspaces";

type SidebarProps = { activeSlug: string };

export function Sidebar({ activeSlug }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="ناوبری اصلی Command Center">
      <div className="sidebar__brand"><LifeMateLogo /></div>
      <nav className="sidebar__nav">
        <ul>
          {workspaces.map((workspace) => {
            const active = workspace.slug === activeSlug;
            return (
              <li key={workspace.slug || "command-center"}>
                <Link className="nav-item" data-active={active ? "true" : "false"} href={workspaceHref(workspace)} aria-current={active ? "page" : undefined}>
                  <span className="nav-item__symbol" aria-hidden="true">{workspace.symbol}</span>
                  <span>{workspace.label}</span>
                  {workspace.slug === "ai" && <span className="nav-item__badge">جدید</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar__status" role="status" aria-label="وضعیت رابط مدیریت">
        <span className="status-dot" aria-hidden="true" />
        <div><strong>پایه رابط آماده است</strong><span>داده تولیدی هنوز متصل نشده.</span></div>
      </div>
    </aside>
  );
}
