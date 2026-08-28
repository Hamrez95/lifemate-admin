"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAdminSession } from "@/src/components/auth/AdminSessionProvider";
import { LifeMateLogo } from "@/src/components/brand/LifeMateLogo";
import { workspaceHref, workspaces } from "@/src/config/workspaces";
import { canAccessWorkspace } from "@/src/lib/admin-api/policy";

type SidebarProps = { activeSlug: string };

export function Sidebar({ activeSlug }: SidebarProps) {
  const admin = useAdminSession();
  const pathname = usePathname();
  const visibleWorkspaces = workspaces.filter((workspace) =>
    canAccessWorkspace(workspace, admin.permissions),
  );
  const canReadAudit = admin.permissions.includes("security.audit.read");
  const isFounder = admin.roles.includes("founder");
  const canReadProductSignals =
    admin.permissions.includes("experiments.read") || admin.permissions.includes("feedback.read");
  const auditActive = pathname === "/security/audit" || pathname.startsWith("/security/audit/");
  const researchActive = pathname === "/research" || pathname.startsWith("/research/");
  const experimentsActive = pathname === "/experiments" || pathname.startsWith("/experiments/");
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <aside className="sidebar" aria-label="ناوبری اصلی Command Center">
      <div className="sidebar__brand">
        <LifeMateLogo />
      </div>
      <nav className="sidebar__nav">
        <ul>
          {visibleWorkspaces.map((workspace) => {
            const active = workspace.slug === activeSlug;
            return (
              <li key={workspace.slug || "command-center"}>
                <Link
                  className="nav-item"
                  data-active={
                    active && !auditActive && !researchActive && !experimentsActive
                      ? "true"
                      : "false"
                  }
                  href={workspaceHref(workspace)}
                  aria-label={workspace.label}
                  aria-current={
                    active && !auditActive && !researchActive && !experimentsActive
                      ? "page"
                      : undefined
                  }
                >
                  <span className="nav-item__symbol" aria-hidden="true">
                    {workspace.symbol}
                  </span>
                  <span>{workspace.label}</span>
                  {workspace.slug === "ai" && <span className="nav-item__badge">جدید</span>}
                </Link>
                {workspace.slug === "analytics" && active && isFounder ? (
                  <Link
                    className="nav-item nav-item--subroute"
                    data-active={researchActive ? "true" : "false"}
                    href="/research"
                    aria-label="Research Studio"
                    aria-current={researchActive ? "page" : undefined}
                  >
                    <span className="nav-item__symbol" aria-hidden="true">
                      ↳
                    </span>
                    <span>Research Studio</span>
                  </Link>
                ) : null}
                {workspace.slug === "analytics" && active && canReadProductSignals ? (
                  <Link
                    className="nav-item nav-item--subroute"
                    data-active={experimentsActive ? "true" : "false"}
                    href="/experiments"
                    aria-label="Experiments, Feedback & Advocacy"
                    aria-current={experimentsActive ? "page" : undefined}
                  >
                    <span className="nav-item__symbol" aria-hidden="true">
                      ↳
                    </span>
                    <span>Experiments & Feedback</span>
                  </Link>
                ) : null}
                {workspace.slug === "security" && active && canReadAudit ? (
                  <Link
                    className="nav-item nav-item--subroute"
                    data-active={auditActive ? "true" : "false"}
                    href="/security/audit"
                    aria-label="گزارش ممیزی"
                    aria-current={auditActive ? "page" : undefined}
                  >
                    <span className="nav-item__symbol" aria-hidden="true">
                      ↳
                    </span>
                    <span>گزارش ممیزی</span>
                  </Link>
                ) : null}
              </li>
            );
          })}
          <li>
            <Link
              className="nav-item"
              data-active={profileActive ? "true" : "false"}
              href="/profile"
              aria-label="پروفایل و تغییر رمز عبور"
              aria-current={profileActive ? "page" : undefined}
            >
              <span className="nav-item__symbol" aria-hidden="true">
                ◎
              </span>
              <span>پروفایل و امنیت</span>
            </Link>
          </li>
        </ul>
      </nav>
      <div className="sidebar__status" role="status" aria-label="وضعیت امنیت نشست مدیریت">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <strong>نشست مدیریتی فعال</strong>
          <span>مجوزها از Admin API دریافت شده‌اند.</span>
        </div>
      </div>
    </aside>
  );
}
