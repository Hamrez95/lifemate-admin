import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getSecurityRbacMatrix,
  type SecurityRbacAssignment,
  type SecurityRbacPermission,
  type SecurityRbacRole,
} from "@/src/lib/admin-api/security-rbac";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./security.module.css";

type SecurityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type RiskLevel = SecurityRbacPermission["riskLevel"];

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function riskLabel(risk: RiskLevel): string {
  if (risk === "STANDARD") return "استاندارد";
  if (risk === "SENSITIVE") return "حساس";
  if (risk === "HIGH_RISK") return "پرریسک";
  return "دسترسی ویژه";
}

function domainLabel(domain: string): string {
  const labels: Record<string, string> = {
    users: "کاربران",
    relationships: "روابط و رضایت",
    support: "پشتیبانی",
    commerce: "تجارت",
    marketing: "بازاریابی",
    finance: "مالی",
    analytics: "تحلیل",
    operations: "عملیات",
    security: "امنیت",
    ai: "هوش مصنوعی",
    settings: "تنظیمات",
    health: "سلامت",
    women_health: "سلامت زنان",
  };
  return labels[domain] ?? domain;
}

function formatAsOf(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function assignmentKey(roleCode: string, permissionCode: string): string {
  return `${roleCode}\u0000${permissionCode}`;
}

function assignmentLabel(
  role: SecurityRbacRole,
  permission: SecurityRbacPermission,
  assignment: SecurityRbacAssignment | undefined,
): string {
  if (!permission.roleAssignable) {
    return assignment
      ? `${permission.code}: این مجوز از طریق نقش عادی مؤثر نیست؛ assignment موجود blocked است.`
      : `${permission.code}: این مجوز خارج از RBAC نقش عادی و فقط در workflow ویژه قابل بررسی است.`;
  }
  if (role.status !== "Active") {
    return assignment
      ? `${role.displayName}: نقش غیرفعال است و assignment مؤثر نیست.`
      : `${role.displayName}: نقش غیرفعال است و این permission assignment ندارد.`;
  }
  return assignment?.effective
    ? `${role.displayName} دارای ${permission.code} به‌صورت direct و مؤثر است.`
    : `${role.displayName} دارای ${permission.code} نیست.`;
}

function cellText(
  role: SecurityRbacRole,
  permission: SecurityRbacPermission,
  assignment: SecurityRbacAssignment | undefined,
): string {
  if (!permission.roleAssignable) return assignment ? "مسدود" : "ویژه";
  if (role.status !== "Active") return assignment ? "غیرفعال" : "—";
  return assignment?.effective ? "دارد" : "—";
}

export default async function SecurityPage({ searchParams }: SecurityPageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.audit.read")) redirect("/forbidden");

  const requested = await searchParams;
  const q = single(requested.q).trim().toLocaleLowerCase("en-US");
  const domain = single(requested.domain);
  const risk = single(requested.risk) as RiskLevel | "";

  const result = await getSecurityRbacMatrix();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const report = result.kind === "ok" ? result.data : null;
  const permissions = report ? report.permissionGroups.flatMap((group) => group.permissions) : [];
  const exactPermissionCodeMatch = q
    ? permissions.some((permission) => permission.code.toLocaleLowerCase("en-US") === q)
    : false;
  const assignmentByKey = new Map(
    report?.assignments.map((assignment) => [
      assignmentKey(assignment.roleCode, assignment.permissionCode),
      assignment,
    ]) ?? [],
  );
  const domains = report?.permissionGroups.map((group) => group.domain) ?? [];
  const filteredPermissions = permissions.filter((permission) => {
    if (domain && permission.domain !== domain) return false;
    if (risk && permission.riskLevel !== risk) return false;
    if (!q) return true;
    const normalizedCode = permission.code.toLocaleLowerCase("en-US");
    if (exactPermissionCodeMatch) return normalizedCode === q;
    const searchable = [
      permission.code,
      permission.domain,
      permission.description,
      domainLabel(permission.domain),
      riskLabel(permission.riskLevel),
    ]
      .join(" ")
      .toLocaleLowerCase("en-US");
    return searchable.includes(q);
  });
  const elevatedCount = report
    ? permissions.filter((permission) => !permission.roleAssignable).length
    : null;
  const sensitiveCount = report
    ? permissions.filter(
        (permission) =>
          permission.riskLevel === "SENSITIVE" ||
          permission.riskLevel === "HIGH_RISK" ||
          permission.riskLevel === "ELEVATED",
      ).length
    : null;
  const hasFilter = Boolean(q || domain || risk);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="امنیت"
        subtitle="کنترل دسترسی، ممیزی و مرزهای حساس Command Center"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="security-title">
            <div className={styles.heroCopy}>
              <p className="eyebrow">REFERENCE 18 · SECURITY COMMAND CENTER</p>
              <h2 id="security-title">مرکز فرمان امنیت</h2>
              <p>
                وضعیت RBAC، ممیزی و مرزهای دسترسی حساس را از قراردادهای canonical مرور کنید. این
                workspace هیچ permission یا Break-glass فرضی ایجاد نمی‌کند و فقط داده تأییدشده را
                نمایش می‌دهد.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} href="/security/audit">
                  مشاهده Audit Log
                </Link>
                <a className={styles.secondaryAction} href="#rbac-matrix">
                  مرور Role × Permission
                </a>
              </div>
            </div>
            <div className={styles.securitySignal} aria-label="خلاصه مرز امنیت">
              <span>Canonical security posture</span>
              <strong>{report?.source.label ?? "—"}</strong>
              <small>آخرین داده: {formatAsOf(report?.freshness.asOfUtc ?? null)}</small>
              <div className={styles.signalPills}>
                <span>Read-only</span>
                <span>AAL2 / RBAC</span>
                <span>Break-glass جدا</span>
              </div>
            </div>
          </section>

          <section className={styles.metricGrid} aria-label="خلاصه امنیت و RBAC">
            <article className={styles.metricCard}>
              <span>نقش‌ها</span>
              <strong>{report ? report.roles.length.toLocaleString("fa-IR") : "—"}</strong>
              <small>Active و Disabled برای review</small>
            </article>
            <article className={styles.metricCard}>
              <span>Permissionها</span>
              <strong>{report ? permissions.length.toLocaleString("fa-IR") : "—"}</strong>
              <small>از منبع canonical RBAC</small>
            </article>
            <article className={styles.metricCard}>
              <span>حساس / پرریسک</span>
              <strong>
                {sensitiveCount === null ? "—" : sensitiveCount.toLocaleString("fa-IR")}
              </strong>
              <small>برای review امنیتی برجسته</small>
            </article>
            <article className={styles.metricCard}>
              <span>خارج از نقش عادی</span>
              <strong>
                {elevatedCount === null ? "—" : elevatedCount.toLocaleString("fa-IR")}
              </strong>
              <small>roleAssignable=false</small>
            </article>
          </section>

          <section className={styles.quickGrid} aria-label="میانبرهای امنیت">
            <Link href="/security/audit" className={styles.quickCard}>
              <span className={styles.quickIcon} aria-hidden="true">
                ◫
              </span>
              <div>
                <strong>Audit Log</strong>
                <p>
                  رویدادهای canonical، نتیجه، actor و correlation را بدون payload حساس مرور کنید.
                </p>
              </div>
              <span aria-hidden="true">←</span>
            </Link>
            <div className={styles.quickCard}>
              <span className={styles.quickIcon} aria-hidden="true">
                ◈
              </span>
              <div>
                <strong>Break-glass</strong>
                <p>
                  Workflow دسترسی موقت هنوز از RBAC عادی جداست؛ این صفحه هیچ bypass ایجاد نمی‌کند.
                </p>
              </div>
              <span className={styles.unavailablePill}>وابسته به قرارداد</span>
            </div>
          </section>

          <section className={styles.boundaryBanner} aria-labelledby="elevated-boundary-title">
            <div>
              <span className={styles.boundaryIcon} aria-hidden="true">
                ◈
              </span>
            </div>
            <div>
              <strong id="elevated-boundary-title">مرز دسترسی حساس باید fail-closed بماند</strong>
              <p>
                {report?.elevatedBoundary.enforcement ??
                  "تا زمانی که قرارداد canonical پاسخ معتبر ندهد، دسترسی ویژه در این workspace unavailable می‌ماند."}
              </p>
              <small>
                {report?.inheritance.reason ??
                  "Founder یا Super Admin نیز از این نما bypass ضمنی دریافت نمی‌کند."}
              </small>
            </div>
          </section>

          <form
            className={styles.filters}
            method="get"
            action="/security"
            aria-label="فیلتر ماتریس RBAC"
          >
            <div className={styles.searchField}>
              <label htmlFor="rbac-q">جست‌وجوی permission</label>
              <input
                id="rbac-q"
                name="q"
                type="search"
                defaultValue={single(requested.q)}
                placeholder="مثلاً security.audit.read"
                autoComplete="off"
              />
            </div>
            <div className={styles.filterField}>
              <label htmlFor="rbac-domain">دامنه</label>
              <select id="rbac-domain" name="domain" defaultValue={domain}>
                <option value="">همه دامنه‌ها</option>
                {domains.map((item) => (
                  <option key={item} value={item}>
                    {domainLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterField}>
              <label htmlFor="rbac-risk">ریسک</label>
              <select id="rbac-risk" name="risk" defaultValue={risk}>
                <option value="">همه سطوح</option>
                <option value="STANDARD">استاندارد</option>
                <option value="SENSITIVE">حساس</option>
                <option value="HIGH_RISK">پرریسک</option>
                <option value="ELEVATED">دسترسی ویژه</option>
              </select>
            </div>
            <div className={styles.filterActions}>
              <button type="submit">اعمال فیلتر</button>
              <Link href="/security">پاک‌کردن</Link>
            </div>
          </form>

          {!report ? (
            <section className={styles.stateBanner} role="status" aria-live="polite">
              <span aria-hidden="true">!</span>
              <div>
                <strong>ماتریس RBAC در دسترس نیست.</strong>
                <p>
                  Admin API یا source canonical پاسخ معتبر نداده است. هیچ role/permission فرضی نمایش
                  داده نمی‌شود.
                </p>
              </div>
            </section>
          ) : null}

          {report?.state === "empty" ? (
            <section className={styles.stateBanner} role="status">
              <span aria-hidden="true">i</span>
              <div>
                <strong>RBAC canonical هنوز پیکربندی کامل ندارد.</strong>
                <p>Source پاسخ داده است اما role یا permission لازم برای matrix خالی است.</p>
              </div>
            </section>
          ) : null}

          {report?.state === "ready" && filteredPermissions.length === 0 ? (
            <section className={styles.stateBanner} role="status">
              <span aria-hidden="true">⌕</span>
              <div>
                <strong>نتیجه‌ای با این فیلتر پیدا نشد.</strong>
                <p>Source خالی نیست؛ فقط فیلتر فعلی با permissionها تطابق ندارد.</p>
              </div>
            </section>
          ) : null}

          {report?.state === "ready" && filteredPermissions.length > 0 ? (
            <>
              <section
                id="rbac-matrix"
                className={styles.matrixPanel}
                aria-labelledby="matrix-heading"
              >
                <header className={styles.panelHeader}>
                  <div>
                    <p className="eyebrow">REFERENCE 19 · EFFECTIVE ASSIGNMENTS</p>
                    <h3 id="matrix-heading">Role × Permission</h3>
                    <p>نمای مستقیم از assignmentهای مؤثر؛ بدون mutation و بدون inheritance فرضی.</p>
                  </div>
                  <span className={styles.readOnlyPill}>فقط مشاهده</span>
                </header>
                <div
                  className={styles.tableRegion}
                  role="region"
                  aria-label="ماتریس نقش و مجوز؛ برای مشاهده ستون‌های بیشتر اسکرول افقی کنید"
                  tabIndex={0}
                >
                  <table className={styles.matrixTable}>
                    <thead>
                      <tr>
                        <th scope="col" className={styles.permissionHeader}>
                          Permission
                        </th>
                        {report.roles.map((role) => (
                          <th key={role.code} scope="col" className={styles.roleHeader}>
                            <strong>
                              <Link href={`/security/roles/${role.code}`}>{role.displayName}</Link>
                            </strong>
                            <span>{role.code}</span>
                            {role.status !== "Active" ? <em>Disabled</em> : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPermissions.map((permission) => (
                        <tr
                          key={permission.code}
                          data-elevated={!permission.roleAssignable ? "true" : "false"}
                        >
                          <th scope="row" className={styles.permissionCell}>
                            <div>
                              <strong>{permission.code}</strong>
                              <span>{permission.description}</span>
                              <div className={styles.permissionMeta}>
                                <span>{domainLabel(permission.domain)}</span>
                                <span data-risk={permission.riskLevel}>
                                  {riskLabel(permission.riskLevel)}
                                </span>
                                {!permission.roleAssignable ? <em>خارج از نقش عادی</em> : null}
                              </div>
                            </div>
                          </th>
                          {report.roles.map((role) => {
                            const assignment = assignmentByKey.get(
                              assignmentKey(role.code, permission.code),
                            );
                            return (
                              <td key={role.code} className={styles.assignmentCell}>
                                <span
                                  className={styles.assignmentMark}
                                  data-state={
                                    !permission.roleAssignable
                                      ? "elevated"
                                      : assignment?.effective
                                        ? "effective"
                                        : assignment
                                          ? "blocked"
                                          : "none"
                                  }
                                  aria-label={assignmentLabel(role, permission, assignment)}
                                  title={assignmentLabel(role, permission, assignment)}
                                >
                                  {cellText(role, permission, assignment)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={styles.footnote}>
                  «دارد» یعنی direct assignment مؤثر. «مسدود/ویژه» هرگز به معنی دسترسی مؤثر از نقش
                  معمولی نیست. این نسخه role inheritance ندارد.
                </p>
              </section>

              <section className={styles.mobileRoles} aria-label="خلاصه موبایل نقش‌ها">
                {report.roles.map((role) => {
                  const effective = filteredPermissions.filter(
                    (permission) =>
                      assignmentByKey.get(assignmentKey(role.code, permission.code))?.effective,
                  );
                  return (
                    <article key={role.code} className={styles.roleCard}>
                      <header>
                        <div>
                          <strong>
                            <Link href={`/security/roles/${role.code}`}>{role.displayName}</Link>
                          </strong>
                          <span>{role.code}</span>
                        </div>
                        <span data-status={role.status}>{role.status}</span>
                      </header>
                      <p>
                        {role.status === "Active"
                          ? `${effective.length.toLocaleString("fa-IR")} permission مؤثر در فیلتر فعلی`
                          : "نقش Disabled است؛ assignmentها مؤثر نیستند."}
                      </p>
                      <ul>
                        {effective.slice(0, 8).map((permission) => (
                          <li key={permission.code}>{permission.code}</li>
                        ))}
                      </ul>
                      {effective.length > 8 ? (
                        <small>+{(effective.length - 8).toLocaleString("fa-IR")} مورد دیگر</small>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            </>
          ) : null}

          {hasFilter ? (
            <p className={styles.filterSummary} role="status">
              فیلتر فعال است؛ {filteredPermissions.length.toLocaleString("fa-IR")} permission از{" "}
              {permissions.length.toLocaleString("fa-IR")} مورد نمایش داده می‌شود.
            </p>
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
