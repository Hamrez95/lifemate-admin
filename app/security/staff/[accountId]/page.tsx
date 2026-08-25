import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getStaffDetail } from "@/src/lib/admin-api/staff-directory";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../staff.module.css";

type Props = { params: Promise<{ accountId: string }> };
function date(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function StaffDetailPage({ params }: Props) {
  const admin = await requireAdminAccess();
  if (
    !admin.permissions.includes("security.staff.manage") ||
    !admin.permissions.includes("security.staff.audit.read")
  )
    redirect("/forbidden");
  const { accountId } = await params;
  const result = await getStaffDetail(accountId);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");
  if (result.kind === "not_found") notFound();

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="جزئیات کارمند"
        subtitle="Access history · Effective permissions · Admin activity"
      >
        <div className={styles.page}>
          <Link className={styles.back} href="/security/staff">
            ← بازگشت به کارکنان
          </Link>
          {result.kind === "unavailable" ? (
            <section className={styles.state} role="status">
              <strong>جزئیات کارمند در دسترس نیست.</strong>
              <p className={styles.muted}>
                {result.correlationId
                  ? `کد پیگیری: ${result.correlationId}`
                  : "هیچ داده جایگزین یا ساختگی نمایش داده نمی‌شود."}
              </p>
            </section>
          ) : null}
          {result.kind === "ok" ? (
            <>
              <section className={styles.hero}>
                <div className={styles.identity}>
                  <p className="eyebrow">STAFF · PRIVACY-SAFE DETAIL</p>
                  <h2>{result.staff.displayName ?? result.staff.username ?? "بدون نام نمایشی"}</h2>
                  <span>
                    {result.staff.username ? `@${result.staff.username}` : "username ثبت نشده"}
                  </span>
                  <span className={styles.code}>{result.staff.accountId}</span>
                </div>
                <span className={styles.status} data-status={result.staff.membershipStatus}>
                  {result.staff.membershipStatus}
                </span>
              </section>

              <section className={styles.metricGrid}>
                <article className={styles.metric}>
                  <span>Permission مؤثر</span>
                  <strong>{result.staff.effectivePermissionCount.toLocaleString("fa-IR")}</strong>
                </article>
                <article className={styles.metric}>
                  <span>نقش فعلی</span>
                  <strong>{result.staff.roles.length.toLocaleString("fa-IR")}</strong>
                </article>
                <article className={styles.metric}>
                  <span>آخرین تغییر دسترسی</span>
                  <strong style={{ fontSize: 14 }}>
                    {date(result.staff.lastAccessChangeAtUtc)}
                  </strong>
                </article>
                <article className={styles.metric}>
                  <span>MFA posture</span>
                  <strong style={{ fontSize: 16 }}>نامشخص</strong>
                  <small>Source canonical این سیگنال را ارائه نمی‌کند</small>
                </article>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className="eyebrow">Current access</p>
                    <h3>نقش‌ها و Permissionهای مؤثر</h3>
                  </div>
                  <small>As of {date(result.asOfUtc)}</small>
                </div>
                <div className={styles.chips}>
                  {result.staff.roles.length ? (
                    result.staff.roles.map((role) => (
                      <Link
                        href={`/security/roles/${role.code}`}
                        className={styles.chip}
                        key={role.code}
                      >
                        {role.displayName} · {role.code}
                      </Link>
                    ))
                  ) : (
                    <span>نقش فعالی وجود ندارد.</span>
                  )}
                </div>
                <div className={styles.permissionGrid}>
                  {result.staff.effectivePermissions.length ? (
                    result.staff.effectivePermissions.map((permission) => (
                      <span className={styles.permission} key={permission.code}>
                        {permission.code} · {permission.riskLevel}
                      </span>
                    ))
                  ) : (
                    <span className={styles.muted}>Permission مؤثری گزارش نشده است.</span>
                  )}
                </div>
                <p className={styles.notice}>
                  تغییر عضویت و نقش همچنان از workflow canonical موجود در صفحه Role Detail انجام
                  می‌شود؛ Founder/Super Admin و self-escalation از مسیر عادی قابل تغییر نیستند.
                </p>
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className="eyebrow">Role history</p>
                    <h3>تاریخچه اعطا و لغو نقش</h3>
                  </div>
                </div>
                {result.staff.roleHistory.length ? (
                  <ul className={styles.timeline}>
                    {result.staff.roleHistory.map((entry, index) => (
                      <li key={`${entry.roleCode}-${entry.startsAtUtc}-${index}`}>
                        <strong>
                          {entry.roleDisplayName} · {entry.roleCode}
                        </strong>
                        <span>شروع: {date(entry.startsAtUtc)}</span>
                        <span>
                          انقضا: {date(entry.expiresAtUtc)} · لغو: {date(entry.revokedAtUtc)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.empty}>تاریخچه نقشی ثبت نشده است.</div>
                )}
              </section>

              <section className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <p className="eyebrow">Staff-scoped audit</p>
                    <h3>فعالیت مدیریتی</h3>
                  </div>
                </div>
                {result.staff.activity.length ? (
                  <ul className={styles.timeline}>
                    {result.staff.activity.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.action}</strong>
                        <span>
                          {entry.result} · {entry.resourceType}
                        </span>
                        <small>{date(entry.occurredAtUtc)}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.empty}>رویداد مدیریتی قابل نمایش وجود ندارد.</div>
                )}
              </section>

              <section className={styles.notice}>
                این صفحه فقط metadata مدیریتی privacy-safe را نشان می‌دهد. token، credential، raw
                health data، private consumer notes و لینک profile مصرف‌کننده از contract حذف
                شده‌اند. مشاهده این detail نیز در audit ثبت می‌شود.
              </section>
            </>
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
