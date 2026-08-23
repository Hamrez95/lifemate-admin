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
  return [25, 50, 100].includes(parsed) ? parsed : 50;
}

function dateOnly(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
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

function nextPageHref(input: { limit: number; from: string; to: string; cursor: string }): string {
  const params = new URLSearchParams({ limit: String(input.limit), cursor: input.cursor });
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  return `/security/audit?${params.toString()}`;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.audit.read")) redirect("/forbidden");

  const requested = await searchParams;
  const limit = requestedLimit(single(requested.limit));
  const from = dateOnly(single(requested.from));
  const to = dateOnly(single(requested.to));
  const cursor = single(requested.cursor).trim();
  const advancedQueryRequested = Boolean(from || to || cursor);
  const invalidRange = Boolean(from && to && from > to);
  const result = invalidRange
    ? null
    : await getAuditLog({ limit, from: from || null, to: to || null, cursor: cursor || null });

  if (result?.kind === "unauthenticated") redirect("/login");
  if (result?.kind === "forbidden") redirect("/forbidden");

  const serverPagingAvailable = result?.kind === "ok" && result.data.supportsServerPaging;
  const contractUnavailable = Boolean(
    result?.kind === "ok" && advancedQueryRequested && !result.data.supportsServerPaging,
  );
  const events =
    result?.kind === "ok" && !contractUnavailable ? result.data.events : null;
  const nextCursor = serverPagingAvailable ? result.data.nextCursor : null;

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
                رویدادهای ثبت‌شده در منبع canonical را بدون دسترسی مستقیم مرورگر به دیتابیس نمایش
                می‌دهد. payload خام، metadata محرمانه و secret در این نما نمایش داده نمی‌شود.
              </p>
            </div>
            <div className={styles.heroActions}>
              <span className={styles.readOnlyPill}>فقط مشاهده</span>
              <Link href="/security">بازگشت به RBAC</Link>
            </div>
          </section>

          <section className={styles.boundary} aria-labelledby="audit-boundary-title">
            <div>
              <strong id="audit-boundary-title">مرز امن API</strong>
              {serverPagingAvailable ? (
                <p>
                  فیلتر تاریخ و صفحه‌بندی روی Admin API اجرا می‌شود و ترتیب رویدادها با cursor پایدار
                  حفظ می‌شود. مرورگر فقط داده ممیزی محدودشده را می‌گیرد و به جدول‌های دیتابیس دسترسی
                  مستقیم ندارد.
                </p>
              ) : (
                <p>
                  API فعلی هنوز قرارداد فیلتر و صفحه‌بندی پایدار را اعلام نکرده است. تا زمان فعال شدن
                  نسخه canonical جدید، فقط آخرین رویدادهای read-only نمایش داده می‌شوند و نتیجه
                  فیلترشده جعل نمی‌شود.
                </p>
              )}
            </div>
          </section>

          <form className={styles.toolbar} method="get" action="/security/audit">
            <div className={styles.field}>
              <label htmlFor="audit-from">از تاریخ</label>
              <input
                id="audit-from"
                name="from"
                type="date"
                defaultValue={from}
                disabled={!serverPagingAvailable}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="audit-to">تا تاریخ</label>
              <input
                id="audit-to"
                name="to"
                type="date"
                defaultValue={to}
                disabled={!serverPagingAvailable}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="audit-limit">تعداد در هر صفحه</label>
              <select id="audit-limit" name="limit" defaultValue={String(limit)}>
                <option value="25">۲۵</option>
                <option value="50">۵۰</option>
                <option value="100">۱۰۰</option>
              </select>
            </div>
            <button type="submit">اعمال فیلتر</button>
            {(from || to || cursor) && (
              <Link className={styles.clearLink} href="/security/audit">
                پاک کردن فیلترها
              </Link>
            )}
          </form>

          <p className={styles.utcHint}>
            {serverPagingAvailable
              ? "مرز روزها برای query سرور بر اساس UTC محاسبه می‌شود؛ زمان رویدادها در جدول به وقت تهران نمایش داده می‌شود."
              : "فیلتر تاریخ تا زمانی که Admin API قرارداد جدید را اعلام نکند غیرفعال می‌ماند."}
          </p>

          {invalidRange ? (
            <section className={styles.state} role="alert">
              <strong>بازه تاریخ معتبر نیست.</strong>
              <p>تاریخ شروع باید قبل از تاریخ پایان یا برابر با آن باشد.</p>
            </section>
          ) : null}

          {contractUnavailable ? (
            <section className={styles.state} role="status" aria-live="polite">
              <strong>فیلتر سروری هنوز فعال نشده است.</strong>
              <p>
                این درخواست نمایش داده نمی‌شود چون API فعلی قرارداد canonical فیلتر و cursor را تأیید
                نکرده است. فیلترها را پاک کنید یا پس از rollout backend دوباره تلاش کنید.
              </p>
            </section>
          ) : null}

          {result?.kind === "unavailable" ? (
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
              <p>منبع canonical پاسخ داده است و برای این بازه نتیجه‌ای وجود ندارد.</p>
            </section>
          ) : null}

          {events && events.length > 0 ? (
            <section className={styles.panel} aria-labelledby="events-heading">
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Canonical events</p>
                  <h3 id="events-heading">رویدادهای ممیزی</h3>
                </div>
                <span>{events.length.toLocaleString("fa-IR")} رویداد در این صفحه</span>
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
                          <time dateTime={event.occurredAtUtc}>
                            {formatDate(event.occurredAtUtc)}
                          </time>
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
              {nextCursor ? (
                <nav className={styles.pagination} aria-label="صفحه‌بندی گزارش ممیزی">
                  <Link href={nextPageHref({ limit, from, to, cursor: nextCursor })}>صفحه بعد</Link>
                </nav>
              ) : null}
            </section>
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
