"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const routeActiveSlug =
    pathname === "/"
      ? ""
      : pathname.startsWith("/research") || pathname.startsWith("/experiments")
        ? "analytics"
        : pathname.startsWith("/operations/cocoon")
          ? "operations"
          : pathname.startsWith("/security")
            ? "security"
            : (pathname.split("/")[1] ?? "");
  const resolvedActiveSlug = routeActiveSlug || activeSlug;
  const visibleWorkspaces = workspaces.filter((workspace) =>
    canAccessWorkspace(workspace, admin.permissions),
  );
  const canReadAudit = admin.permissions.includes("security.audit.read");
  const isFounder = admin.roles.includes("founder");
  const canReadProductSignals =
    admin.permissions.includes("experiments.read") ||
    admin.permissions.includes("feedback.read") ||
    admin.permissions.includes("feedback.trends.read");
  const auditActive = pathname === "/security/audit" || pathname.startsWith("/security/audit/");
  const researchActive = pathname === "/research" || pathname.startsWith("/research/");
  const experimentsActive = pathname === "/experiments" || pathname.startsWith("/experiments/");
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");
  const cocoonActive = pathname.startsWith("/operations/cocoon");

  function renderWorkspace(workspace: (typeof visibleWorkspaces)[number]) {
    const workspacePath = workspaceHref(workspace);
    const routeMatchesWorkspace =
      pathname === workspacePath ||
      (workspacePath !== "/" && pathname.startsWith(`${workspacePath}/`));
    const active = workspace.slug === resolvedActiveSlug || routeMatchesWorkspace;
    const isPrimaryRoute = active && !auditActive && !researchActive && !experimentsActive;

    return (
      <li key={workspace.slug || "command-center"}>
        <Link
          className="nav-item"
          data-active={isPrimaryRoute ? "true" : "false"}
          href={workspaceHref(workspace)}
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
    <aside className="sidebar" aria-label="ناوبری اصلی Command Center">
      <div className="sidebar__brand">
        <LifeMateLogo />
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
