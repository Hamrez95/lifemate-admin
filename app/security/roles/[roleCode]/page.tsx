import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getSecurityRoleDetail,
  type SecurityRoleDetailPermission,
  type SecurityRoleMembership,
} from "@/src/lib/admin-api/security-role-detail";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./role-detail.module.css";

type RoleDetailPageProps = {
  params: Promise<{ roleCode: string }>;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

function formatDateTime(value: string | null): string {
  return value ? dateTimeFormatter.format(new Date(value)) : "بدون محدودیت";
}

function riskLabel(risk: SecurityRoleDetailPermission["riskLevel"]): string {
  if (risk === "STANDARD") return "استاندارد";
  if (risk === "SENSITIVE") return "حساس";
  if (risk === "HIGH_RISK") return "پرریسک";
  return "دسترسی ویژه";
}

function memberStateLabel(state: SecurityRoleMembership["state"]): string {
  const labels: Record<SecurityRoleMembership["state"], string> = {
    active: "فعال",
    scheduled: "زمان‌بندی‌شده",
    expired: "منقضی",
    revoked: "لغوشده",
    member_inactive: "عضو غیرفعال",
    role_disabled: "نقش غیرفعال",
  };
  return labels[state];
}

function groupPermissions(permissions: SecurityRoleDetailPermission[]) {
  const grouped = new Map<string, SecurityRoleDetailPermission[]>();
  for (const permission of permissions) {
    const items = grouped.get(permission.domain) ?? [];
    items.push(permission);
    grouped.set(permission.domain, items);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
}

export default async function RoleDetailPage({ params }: RoleDetailPageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.audit.read")) redirect("/forbidden");

  const { roleCode } = await params;
  const result = await getSecurityRoleDetail(roleCode);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");
  if (result.kind === "not_found" || result.kind === "invalid_role_code") notFound();

  const report = result.kind === "ok" ? result.data : null;
  const sensitivePermissions =
    report?.permissions.filter(
      (permission) =>
        permission.riskLevel === "SENSITIVE" ||
        permission.riskLevel === "HIGH_RISK" ||
        permission.riskLevel === "ELEVATED",
    ) ?? [];
  const elevatedPermissions =
    report?.permissions.filter((permission) => !permission.roleAssignable) ?? [];
  const activeMemberships = report?.memberships.filter((membership) => membership.effective) ?? [];
  const permissionGroups = report ? groupPermissions(report.permissions) : [];

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="امنیت"
        subtitle="Role Detail، membership lifecycle و permission provenance"
      >
        <div className={styles.page}>
          <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
            <Link href="/security">ماتریس نقش و مجوز</Link>
            <span aria-hidden="true">/</span>
            <span>{report?.role.displayName ?? roleCode}</span>
          </nav>

          <section className={styles.hero} aria-labelledby="role-detail-title">
            <div>
              <p className="eyebrow">ADM-SEC-002 · READ ONLY</p>
              <h2 id="role-detail-title">{report?.role.displayName ?? "جزئیات نقش"}</h2>
              <p>
                نمای audit-friendly از permissionهای مستقیم، membership window و permissionهای مؤثر.
                این صفحه امکان افزودن نقش، تغییر membership یا ارتقای دسترسی ندارد.
              </p>
            </div>
            <div className={styles.sourceCard} aria-label="منبع و تازگی جزئیات نقش">
              <span>Canonical source</span>
              <strong>{report?.source.label ?? "—"}</strong>
              <small>As of {formatDateTime(report?.freshness.asOfUtc ?? null)}</small>
            </div>
          </section>

          {!report ? (
            <section className={styles.stateBanner} role="status" aria-live="polite">
              <strong>جزئیات نقش در دسترس نیست.</strong>
              <p>
                Admin API پاسخ معتبر نداده است؛ اطلاعات نقش یا membership حدس زده و cache قدیمی
                نمایش داده نمی‌شود.
              </p>
            </section>
          ) : (
            <>
              <section className={styles.metricGrid} aria-label="خلاصه نقش">
                <article className={styles.metricCard}>
                  <span>کد نقش</span>
                  <strong className={styles.code}>{report.role.code}</strong>
                  <small>Rank {report.role.rank.toLocaleString("fa-IR")}</small>
                </article>
                <article className={styles.metricCard}>
                  <span>وضعیت</span>
                  <strong>{report.role.status === "Active" ? "فعال" : "غیرفعال"}</strong>
                  <small>{report.role.isSystem ? "System role" : "Custom role"}</small>
                </article>
                <article className={styles.metricCard}>
                  <span>Permission مستقیم</span>
                  <strong>{report.permissions.length.toLocaleString("fa-IR")}</strong>
                  <small>
                    {sensitivePermissions.length.toLocaleString("fa-IR")} مورد حساس/پرریسک
                  </small>
                </article>
                <article className={styles.metricCard}>
                  <span>Membership مؤثر</span>
                  <strong>{activeMemberships.length.toLocaleString("fa-IR")}</strong>
                  <small>
                    از {report.memberships.length.toLocaleString("fa-IR")} رکورد lifecycle
                  </small>
                </article>
              </section>

              {elevatedPermissions.length > 0 ? (
                <section className={styles.warning} aria-labelledby="elevated-role-warning">
                  <span aria-hidden="true">◈</span>
                  <div>
                    <strong id="elevated-role-warning">مرز دسترسی ویژه حفظ شده است</strong>
                    <p>
                      {elevatedPermissions.length.toLocaleString("fa-IR")} permission در این نقش
                      roleAssignable=false است و برای عضو فعال هم از RBAC عادی مؤثر نمی‌شود.
                    </p>
                  </div>
                </section>
              ) : null}

              <section className={styles.panel} aria-labelledby="permissions-title">
                <header className={styles.panelHeader}>
                  <div>
                    <p className="eyebrow">Direct permission set</p>
                    <h3 id="permissions-title">Permissionهای نقش</h3>
                  </div>
                  <span className={styles.readOnlyPill}>فقط مشاهده</span>
                </header>

                {permissionGroups.length === 0 ? (
                  <div className={styles.emptyState} role="status">
                    این نقش permission مستقیم ندارد.
                  </div>
                ) : (
                  <div className={styles.permissionGroups}>
                    {permissionGroups.map(([domain, permissions]) => (
                      <section
                        key={domain}
                        className={styles.permissionGroup}
                        aria-label={`دامنه ${domain}`}
                      >
                        <header>
                          <strong>{domain}</strong>
                          <span>{permissions.length.toLocaleString("fa-IR")} permission</span>
                        </header>
                        <ul>
                          {permissions.map((permission) => (
                            <li
                              key={permission.code}
                              data-blocked={!permission.effectiveForActiveMember}
                            >
                              <div>
                                <strong className={styles.code}>{permission.code}</strong>
                                <p>{permission.description}</p>
                              </div>
                              <div className={styles.permissionMeta}>
                                <span data-risk={permission.riskLevel}>
                                  {riskLabel(permission.riskLevel)}
                                </span>
                                <span>
                                  {permission.source === "direct" ? "مستقیم" : permission.source}
                                </span>
                                {!permission.effectiveForActiveMember ? (
                                  <em>
                                    {permission.blockedReason === "permission_not_role_assignable"
                                      ? "خارج از نقش عادی"
                                      : "نقش غیرفعال"}
                                  </em>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel} aria-labelledby="memberships-title">
                <header className={styles.panelHeader}>
                  <div>
                    <p className="eyebrow">Membership lifecycle</p>
                    <h3 id="memberships-title">عضویت‌های ادمین</h3>
                  </div>
                  <span className={styles.readOnlyPill}>UUID only</span>
                </header>
                <p className={styles.identityNote}>
                  منبع canonical این control plane نام یا ایمیل عضو را ارائه نمی‌کند؛ برای جلوگیری
                  از نسبت‌دادن PII نادرست، فقط Account UUID و وضعیت lifecycle نمایش داده می‌شود.
                </p>

                {report.memberships.length === 0 ? (
                  <div className={styles.emptyState} role="status">
                    برای این نقش membership ثبت‌شده‌ای وجود ندارد.
                  </div>
                ) : (
                  <>
                    <div
                      className={styles.tableRegion}
                      role="region"
                      aria-label="جدول عضویت‌های نقش؛ برای ستون‌های بیشتر اسکرول افقی کنید"
                      tabIndex={0}
                    >
                      <table className={styles.memberTable}>
                        <thead>
                          <tr>
                            <th scope="col">Account</th>
                            <th scope="col">وضعیت</th>
                            <th scope="col">شروع</th>
                            <th scope="col">پایان</th>
                            <th scope="col">نقش‌های جاری</th>
                            <th scope="col">Permission مؤثر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.memberships.map((membership) => (
                            <tr key={membership.membershipId}>
                              <th scope="row" className={styles.accountCell}>
                                <code>{membership.accountId}</code>
                                <small>{membership.membershipId}</small>
                              </th>
                              <td>
                                <span className={styles.statePill} data-state={membership.state}>
                                  {memberStateLabel(membership.state)}
                                </span>
                              </td>
                              <td>{formatDateTime(membership.startsAtUtc)}</td>
                              <td>{formatDateTime(membership.expiresAtUtc)}</td>
                              <td>
                                {membership.currentRoleCodes.length > 0
                                  ? membership.currentRoleCodes.join(" · ")
                                  : "—"}
                              </td>
                              <td>
                                <details>
                                  <summary>
                                    {membership.effectivePermissions.length.toLocaleString("fa-IR")}{" "}
                                    مورد
                                  </summary>
                                  <ul className={styles.provenanceList}>
                                    {membership.effectivePermissions.map((permission) => (
                                      <li key={permission.code}>
                                        <code>{permission.code}</code>
                                        <small>
                                          از نقش: {permission.sourceRoleCodes.join("، ")}
                                        </small>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.mobileMembers} aria-label="خلاصه موبایل عضویت‌های نقش">
                      {report.memberships.map((membership) => (
                        <article key={membership.membershipId}>
                          <header>
                            <code>{membership.accountId}</code>
                            <span className={styles.statePill} data-state={membership.state}>
                              {memberStateLabel(membership.state)}
                            </span>
                          </header>
                          <dl>
                            <div>
                              <dt>شروع</dt>
                              <dd>{formatDateTime(membership.startsAtUtc)}</dd>
                            </div>
                            <div>
                              <dt>پایان</dt>
                              <dd>{formatDateTime(membership.expiresAtUtc)}</dd>
                            </div>
                            <div>
                              <dt>نقش‌های جاری</dt>
                              <dd>{membership.currentRoleCodes.join("، ") || "—"}</dd>
                            </div>
                            <div>
                              <dt>Permission مؤثر</dt>
                              <dd>
                                {membership.effectivePermissions.length.toLocaleString("fa-IR")}
                              </dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
