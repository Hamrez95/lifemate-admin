import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getAuditLog, type AuditLogEvent } from "@/src/lib/admin-api/audit-log";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./audit.module.css";

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function requestedLimit(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return [25, 50, 100, 200].includes(parsed) ? parsed : 50;
}

function display(value: string | null): string {
  return value && value.trim() ? value : "—";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

function resultLabel(value: string): string {
  const normalized = value.toLocaleLowerCase("en-US");
  if (normalized === "succeeded" || normalized === "success") return "موفق";
  if (normalized === "failed" || normalized === "failure") return "ناموفق";
  if (normalized === "denied") return "ردشده";
  return value;
}

function eventReference(event: AuditLogEvent): string {
  return event.resourceId ? `${event.resourceType} · ${event.resourceId}` : event.resourceType;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.audit.read")) redirect("/forbidden");

  const requested = await searchParams;
  const limit = requestedLimit(single(requested.limit));
  const result = await getAuditLog(limit);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const events = result.kind === "ok" ? result.data.events : null;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="گزارش ممیزی"
        subtitle="رویدادهای واقعی و فقط‌خواندنی Admin API"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="audit-title">
            <div>
              <p className="eyebrow">ADM-SEC-003 · READ ONLY</p>
              <h2 id="audit-title">Audit Log Explorer</h2>
              <p>
                آخرین رویدادهای ثبت‌شده در منبع canonical را بدون دسترسی مستقیم مرورگر به دیتابیس
                نمایش می‌دهد. payload خام، metadata محرمانه و secret در این نما نمایش داده نمی‌شود.
              </p>
            </div>
            <div className={styles.heroActions}>
              <span className={styles.readOnlyPill}>فقط مشاهده</span>
              <Link href="/security">بازگشت به RBAC</Link>
            </div>
          </section>

          <section className={styles.boundary} aria-labelledby="audit-boundary-title">
            <div>
              <strong id="audit-boundary-title">مرز فعلی API</strong>
              <p>
                این نسخه فقط آخرین N رویداد را از endpoint محدودشده می‌خواند. فیلتر تاریخ و pagination
                پایدار هنوز در قرارداد canonical موجود نیست؛ بنابراین این صفحه آن قابلیت‌ها را شبیه‌سازی
                نمی‌کند.
              </p>
            </div>
          </section>

          <form className={styles.toolbar} method="get" action="/security/audit">
            <label htmlFor="audit-limit">تعداد رویدادهای اخیر</label>
            <select id="audit-limit" name="limit" defaultValue={String(limit)}>
              <option value="25">۲۵</option>
              <option value="50">۵۰</option>
              <option value="100">۱۰۰</option>
              <option value="200">۲۰۰</option>
            </select>
            <button type="submit">به‌روزرسانی نما</button>
          </form>

          {result.kind === "unavailable" ? (
            <section className={styles.state} role="status" aria-live="polite">
              <strong>گزارش ممیزی در دسترس نیست.</strong>
              <p>
                Admin API پاسخ معتبر نداد. هیچ رویداد فرضی نمایش داده نمی‌شود.
                {result.correlationId ? ` شناسه پیگیری: ${result.correlationId}` : ""}
              </p>
            </section>
          ) : null}

          {events?.length === 0 ? (
            <section className={styles.state} role="status">
              <strong>رویدادی برای نمایش وجود ندارد.</strong>
              <p>منبع canonical پاسخ داده است و مجموعه فعلی خالی است.</p>
            </section>
          ) : null}

          {events && events.length > 0 ? (
            <section className={styles.panel} aria-labelledby="events-heading">
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Canonical events</p>
                  <h3 id="events-heading">آخرین رویدادها</h3>
                </div>
                <span>{events.length.toLocaleString("fa-IR")} رویداد</span>
              </header>
              <div
                className={styles.tableRegion}
                role="region"
                aria-label="جدول رویدادهای ممیزی؛ برای ستون‌های بیشتر اسکرول افقی کنید"
                tabIndex={0}
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">زمان</th>
                      <th scope="col">اقدام</th>
                      <th scope="col">نتیجه</th>
                      <th scope="col">مرجع</th>
                      <th scope="col">عامل</th>
                      <th scope="col">دسترسی ویژه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <time dateTime={event.occurredAtUtc}>{formatDate(event.occurredAtUtc)}</time>
                        </td>
                        <td>
                          <strong>{event.action}</strong>
                          <small>{event.reason ? display(event.reason) : "—"}</small>
                        </td>
                        <td>
                          <span className={styles.result} data-result={event.result.toLowerCase()}>
                            {resultLabel(event.result)}
                          </span>
                        </td>
                        <td>
                          <span>{eventReference(event)}</span>
                          <small>Correlation: {event.correlationId}</small>
                        </td>
                        <td>{display(event.actorAccountId)}</td>
                        <td>{event.elevatedAccess ? "بله" : "خیر"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
