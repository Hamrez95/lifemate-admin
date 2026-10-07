"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAdminSession } from "@/src/components/auth/AdminSessionProvider";
import { LifeMateLogo } from "@/src/components/brand/LifeMateLogo";
import { workspaceHref, workspaces } from "@/src/config/workspaces";
import { canAccessWorkspace } from "@/src/lib/admin-api/policy";

type SidebarProps = { activeSlug: string };

const workspaceGroups = [
  {
    label: "فضاهای کاری",
    slugs: ["", "users", "analytics", "relationships", "support", "commerce"],
  },
  { label: "رشد و عملیات", slugs: ["marketing", "finance", "operations"] },
  { label: "کنترل و دسترسی", slugs: ["security", "privacy", "ai", "settings"] },
] as const;

export function Sidebar({ activeSlug }: SidebarProps) {
  const admin = useAdminSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    from: string;
    to: string;
  } | null>(null);
  useEffect(() => {
    if (!pendingNavigation) return;
    const timeout = window.setTimeout(() => setPendingNavigation(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [pathname, pendingNavigation]);

  const activePathname = pendingNavigation?.from === pathname ? pendingNavigation.to : pathname;
  const routeActiveSlug =
    activePathname === "/"
      ? ""
      : activePathname.startsWith("/research") || activePathname.startsWith("/experiments")
        ? "analytics"
        : activePathname.startsWith("/operations/cocoon")
          ? "operations"
          : activePathname.startsWith("/security")
            ? "security"
            : (activePathname.split("/")[1] ?? "");
  const resolvedActiveSlug = activePathname === "/" ? "" : routeActiveSlug || activeSlug;
  const visibleWorkspaces = workspaces.filter((workspace) =>
    canAccessWorkspace(workspace, admin.permissions),
  );
  const canReadAudit = admin.permissions.includes("security.audit.read");
  const isFounder = admin.roles.includes("founder");
  const canReadProductSignals =
    admin.permissions.includes("experiments.read") ||
    admin.permissions.includes("feedback.read") ||
    admin.permissions.includes("feedback.trends.read");
  const auditActive =
    activePathname === "/security/audit" || activePathname.startsWith("/security/audit/");
  const researchActive = activePathname === "/research" || activePathname.startsWith("/research/");
  const experimentsActive =
    activePathname === "/experiments" || activePathname.startsWith("/experiments/");
  const profileActive = activePathname === "/profile" || activePathname.startsWith("/profile/");
  const cocoonActive = activePathname.startsWith("/operations/cocoon");

  function onNavigateTo(href: string) {
    return () => {
      if (href !== pathname) setPendingNavigation({ from: pathname, to: href });
    };
  }

  function renderWorkspace(workspace: (typeof visibleWorkspaces)[number]) {
    const workspacePath = workspaceHref(workspace);
    const routeMatchesWorkspace =
      activePathname === workspacePath ||
      (workspacePath !== "/" && activePathname.startsWith(`${workspacePath}/`));
    const active = workspace.slug === resolvedActiveSlug || routeMatchesWorkspace;
    const isPrimaryRoute = active && !auditActive && !researchActive && !experimentsActive;

    return (
      <li key={workspace.slug || "command-center"}>
        <Link
          className="nav-item"
          data-active={isPrimaryRoute ? "true" : "false"}
          href={workspaceHref(workspace)}
          onNavigate={onNavigateTo(workspacePath)}
          prefetch={false}
          aria-label={workspace.label}
          aria-current={isPrimaryRoute ? "page" : undefined}
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
            onNavigate={onNavigateTo("/research")}
            prefetch={false}
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
            onNavigate={onNavigateTo("/experiments")}
            prefetch={false}
            aria-label="Experiments, Feedback & Advocacy"
            aria-current={experimentsActive ? "page" : undefined}
          >
            <span className="nav-item__symbol" aria-hidden="true">
              ↳
            </span>
            <span>Experiments & Feedback</span>
          </Link>
        ) : null}
        {workspace.slug === "operations" && active ? (
          <Link
            className="nav-item nav-item--subroute"
            data-active={cocoonActive ? "true" : "false"}
            href="/operations/cocoon"
            onNavigate={onNavigateTo("/operations/cocoon")}
            prefetch={false}
            aria-label="CocoonMate operations"
            aria-current={cocoonActive ? "page" : undefined}
          >
            <span className="nav-item__symbol" aria-hidden="true">
              ↳
            </span>
            <span>CocoonMate</span>
          </Link>
        ) : null}
        {workspace.slug === "security" && active && canReadAudit ? (
          <Link
            className="nav-item nav-item--subroute"
            data-active={auditActive ? "true" : "false"}
            href="/security/audit"
            onNavigate={onNavigateTo("/security/audit")}
            prefetch={false}
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
  }

  return (
    <aside
      className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}
      aria-label="ناوبری اصلی Command Center"
    >
      <div className="sidebar__brand">
        <div className="sidebar__brand-row">
          <LifeMateLogo />
          <button
            className="sidebar__collapse-button"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "باز کردن نوار کناری" : "جمع کردن نوار کناری"}
            aria-expanded={!collapsed}
          >
            <span aria-hidden="true">{collapsed ? "→" : "←"}</span>
          </button>
        </div>
        <div className="sidebar__workspace-switcher" aria-label="محیط فعال">
          <span>محیط فعال</span>
          <strong>LifeMate Command Center</strong>
          <span className="sidebar__workspace-chevron" aria-hidden="true">
            ⌄
          </span>
        </div>
      </div>
      <nav className="sidebar__nav">
        {workspaceGroups.map((group) => {
          const groupWorkspaces = group.slugs
            .map((slug) => visibleWorkspaces.find((workspace) => workspace.slug === slug))
            .filter((workspace): workspace is (typeof visibleWorkspaces)[number] =>
              Boolean(workspace),
            );
          if (groupWorkspaces.length === 0) return null;
          return (
            <section
              className="sidebar__group"
              key={group.label}
              aria-labelledby={`nav-${group.label}`}
            >
              <h2 id={`nav-${group.label}`} className="sidebar__group-label">
                {group.label}
              </h2>
              <ul>{groupWorkspaces.map(renderWorkspace)}</ul>
            </section>
          );
        })}
        <section className="sidebar__group sidebar__group--last" aria-labelledby="nav-account">
          <h2 id="nav-account" className="sidebar__group-label">
            حساب
          </h2>
          <ul>
            <li>
              <Link
                className="nav-item"
                data-active={profileActive ? "true" : "false"}
                href="/profile"
                onNavigate={onNavigateTo("/profile")}
                prefetch={false}
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
        </section>
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
