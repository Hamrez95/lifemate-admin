import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getStaffDirectory } from "@/src/lib/admin-api/staff-directory";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./staff.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
function date(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function StaffDirectoryPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.staff.manage")) redirect("/forbidden");
  const requested = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "status", "role", "cursor"] as const) {
    const value = one(requested[key]).trim();
    if (value) params.set(key, value);
  }
  params.set("pageSize", "25");
  const result = await getStaffDirectory(params);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const data = result.kind === "ok" ? result : null;
  const active = data?.items.filter((item) => item.membershipStatus === "Active").length ?? 0;
  const roles = new Set(data?.items.flatMap((item) => item.roles.map((role) => role.code)) ?? []);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="کارکنان"
        subtitle="Founder Staff Directory · داده واقعی و privacy-safe"
      >
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <p className="eyebrow">SECURITY · STAFF CONTROL PLANE</p>
              <h2>دایرکتوری کارکنان Command Center</h2>
              <p className={styles.muted}>
                هویت امن، نقش‌های فعلی، وضعیت عضویت و فعالیت مدیریتی از Admin API canonical خوانده
                می‌شوند. داده سلامت، credential یا token در این نما وجود ندارد.
              </p>
            </div>
            <Link className={styles.linkButton} href="/security">
              Role × Permission
            </Link>
          </section>

          <section className={styles.metricGrid} aria-label="خلاصه کارکنان صفحه فعلی">
            <article className={styles.metric}>
              <span>نمایش در این صفحه</span>
              <strong>{data ? data.items.length.toLocaleString("fa-IR") : "—"}</strong>
            </article>
            <article className={styles.metric}>
              <span>عضویت فعال</span>
              <strong>{data ? active.toLocaleString("fa-IR") : "—"}</strong>
            </article>
            <article className={styles.metric}>
              <span>نقش‌های دیده‌شده</span>
              <strong>{data ? roles.size.toLocaleString("fa-IR") : "—"}</strong>
            </article>
            <article className={styles.metric}>
              <span>MFA posture</span>
              <strong>نامشخص</strong>
              <small>Provider signal در contract موجود نیست</small>
            </article>
          </section>

          <form
            className={`${styles.panel} ${styles.filters}`}
            method="get"
            action="/security/staff"
            aria-label="فیلتر کارکنان"
          >
            <label className={styles.field}>
              <span>جست‌وجوی امن</span>
              <input
                name="q"
                type="search"
                minLength={2}
                maxLength={80}
                defaultValue={one(requested.q)}
                placeholder="username یا نام نمایشی"
              />
            </label>
            <label className={styles.field}>
              <span>وضعیت</span>
              <select name="status" defaultValue={one(requested.status)}>
                <option value="">همه</option>
                <option value="Active">فعال</option>
                <option value="Disabled">غیرفعال</option>
                <option value="Revoked">لغوشده</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>کد نقش</span>
              <input
                name="role"
                pattern="[a-z][a-z0-9_]{1,63}"
                defaultValue={one(requested.role)}
                placeholder="support"
              />
            </label>
            <div className={styles.actions}>
              <button className={styles.button} type="submit">
                اعمال
              </button>
              <Link className={styles.linkButton} href="/security/staff">
                پاک‌کردن
              </Link>
            </div>
          </form>

          {result.kind === "invalid" ? (
            <section className={styles.state} role="alert">
              <strong>فیلتر معتبر نیست.</strong>
              <p className={styles.muted}>مقادیر جست‌وجو، نقش یا cursor را بررسی کنید.</p>
            </section>
          ) : null}
          {result.kind === "unavailable" ? (
            <section className={styles.state} role="status">
              <strong>Staff API فعلاً در دسترس نیست.</strong>
              <p className={styles.muted}>
                {result.correlationId
                  ? `کد پیگیری: ${result.correlationId}`
                  : "هیچ داده جایگزین یا ساختگی نمایش داده نمی‌شود."}
              </p>
            </section>
          ) : null}

          {data ? (
            <section className={styles.panel} aria-labelledby="staff-table-title">
              <div className={styles.sectionHeader}>
                <div>
                  <p className="eyebrow">Canonical directory</p>
                  <h3 id="staff-table-title">کارکنان</h3>
                </div>
                <small>As of {date(data.asOfUtc)}</small>
              </div>
              {data.items.length === 0 ? (
                <div className={styles.empty}>برای فیلتر فعلی کارمندی پیدا نشد.</div>
              ) : (
                <div
                  className={styles.tableWrap}
                  role="region"
                  tabIndex={0}
                  aria-label="جدول کارکنان؛ برای ستون‌های بیشتر اسکرول کنید"
                >
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>کارمند</th>
                        <th>وضعیت</th>
                        <th>نقش‌ها</th>
                        <th>Permission</th>
                        <th>آخرین تغییر دسترسی</th>
                        <th>آخرین فعالیت</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => (
                        <tr key={item.accountId}>
                          <td>
                            <div className={styles.identity}>
                              <strong>
                                {item.displayName ?? item.username ?? "بدون نام نمایشی"}
                              </strong>
                              <span>
                                {item.username ? `@${item.username}` : "username ثبت نشده"}
                              </span>
                              <span className={styles.code}>{item.accountId}</span>
                            </div>
                          </td>
                          <td>
                            <span className={styles.status} data-status={item.membershipStatus}>
                              {item.membershipStatus}
                            </span>
                          </td>
                          <td>
                            <div className={styles.chips}>
                              {item.roles.length ? (
                                item.roles.map((role) => (
                                  <span className={styles.chip} key={role.code}>
                                    {role.displayName}
                                  </span>
                                ))
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                          </td>
                          <td>{item.effectivePermissionCount.toLocaleString("fa-IR")}</td>
                          <td>{date(item.lastAccessChangeAtUtc)}</td>
                          <td>
                            {item.lastAdminActivity ? (
                              <div className={styles.identity}>
                                <strong>{item.lastAdminActivity.action}</strong>
                                <span>{item.lastAdminActivity.result}</span>
                                <small>{date(item.lastAdminActivity.occurredAtUtc)}</small>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <Link
                              className={styles.linkButton}
                              href={`/security/staff/${item.accountId}`}
                            >
                              جزئیات
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data.nextCursor ? (
                <div className={styles.pagination}>
                  <Link
                    className={styles.linkButton}
                    href={`/security/staff?${new URLSearchParams({ ...(one(requested.q) ? { q: one(requested.q) } : {}), ...(one(requested.status) ? { status: one(requested.status) } : {}), ...(one(requested.role) ? { role: one(requested.role) } : {}), cursor: data.nextCursor }).toString()}`}
                  >
                    صفحه بعد
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
