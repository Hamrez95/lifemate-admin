import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getOperationsSnapshot } from "@/src/lib/admin-api/operations";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../ops-settings.module.css";

const canonicalPaths = [
  { href: "/security/audit", label: "Audit و رخدادهای ثبت‌شده" },
  { href: "/support", label: "صف پشتیبانی و incidentهای کاربری" },
  { href: "/marketing/content-calendar", label: "اجرای انتشارهای canonical" },
  { href: "/finance", label: "read model مالی canonical" },
] as const;

function stateLabel(state: "ready" | "unknown" | "unavailable") {
  if (state === "ready") return "Ready";
  if (state === "unknown") return "Unknown";
  return "Unavailable";
}

function sourceLabel(source: string) {
  return source === "not-instrumented"
    ? "منبع هنوز instrument نشده است."
    : `منبع: ${source}`;
}

export default async function OperationsPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("operations.read")) redirect("/forbidden");

  const result = await getOperationsSnapshot();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="operations"
        title="عملیات"
        subtitle="مرکز مشاهده عملیات فقط بر پایه telemetry canonical و قابل‌ردیابی"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="operations-title">
            <p className="eyebrow">ADM-OPS · Reference 17</p>
            <h2 id="operations-title">مرکز عملیات LifeMate</h2>
            <p>
              وضعیت سلامت، latency، job، deploy، provider و incident فقط از read
              model canonical Core نمایش داده می‌شود. هر بخشی که instrumentation
              معتبر ندارد صریحاً Unknown باقی می‌ماند.
            </p>
          </section>

          {result.kind === "unavailable" ? (
            <section
              className={styles.banner}
              role="status"
              aria-live="polite"
            >
              <span className={styles.bannerIcon} aria-hidden="true">
                i
              </span>
              <div>
                <strong>Operational visibility فعلاً در دسترس نیست.</strong>
                <p>
                  هیچ health، latency، deploy، provider یا incident جایگزین ساخته
                  نمی‌شود.
                  {result.correlationId
                    ? ` کد پیگیری: ${result.correlationId}`
                    : ""}
                </p>
              </div>
            </section>
          ) : (
            <>
              <section
                className={styles.banner}
                role="status"
                aria-live="polite"
              >
                <span className={styles.bannerIcon} aria-hidden="true">
                  i
                </span>
                <div>
                  <strong>
                    Telemetry فقط در حد شواهد موجود نمایش داده می‌شود.
                  </strong>
                  <p>
                    آخرین snapshot در{" "}
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Tehran",
                    }).format(new Date(result.snapshot.freshness.asOfUtc))}{" "}
                    دریافت شده است. Unknown به معنی سالم بودن سرویس نیست.
                  </p>
                </div>
              </section>

              <section
                className={styles.grid3}
                aria-label="وضعیت قابلیت‌های عملیاتی"
              >
                {result.snapshot.services.map((service) => (
                  <article key={service.key} className={styles.card}>
                    <header className={styles.cardHeader}>
                      <h3>سلامت سرویس</h3>
                      <span className={styles.badge}>
                        {stateLabel(service.state)}
                      </span>
                    </header>
                    <p>
                      <strong className={styles.codeSafe}>{service.key}</strong>
                    </p>
                    <p>{sourceLabel(service.source)}</p>
                    <p>
                      latency probe:{" "}
                      {service.latencyMs === null
                        ? "Unknown"
                        : `${service.latencyMs} ms`}
                    </p>
                  </article>
                ))}

                <article className={styles.card}>
                  <header className={styles.cardHeader}>
                    <h3>وظایف پس‌زمینه</h3>
                    <span className={styles.badge}>
                      {stateLabel(result.snapshot.backgroundJobs.state)}
                    </span>
                  </header>
                  <p>{sourceLabel(result.snapshot.backgroundJobs.source)}</p>
                </article>

                <article className={styles.card}>
                  <header className={styles.cardHeader}>
                    <h3>انتشار و نسخه‌ها</h3>
                    <span className={styles.badge}>
                      {stateLabel(result.snapshot.deployments.state)}
                    </span>
                  </header>
                  <p>{sourceLabel(result.snapshot.deployments.source)}</p>
                  <p>
                    release reference:{" "}
                    {result.snapshot.deployments.releaseReference ?? "Unknown"}
                  </p>
                </article>

                <article className={styles.card}>
                  <header className={styles.cardHeader}>
                    <h3>یکپارچه‌سازی‌های خارجی</h3>
                    <span className={styles.badge}>
                      {stateLabel(result.snapshot.providers.state)}
                    </span>
                  </header>
                  <p>{sourceLabel(result.snapshot.providers.source)}</p>
                </article>

                <article className={styles.card}>
                  <header className={styles.cardHeader}>
                    <h3>رخداد فعال</h3>
                    <span className={styles.badge}>
                      {stateLabel(result.snapshot.incidents.state)}
                    </span>
                  </header>
                  <p>{sourceLabel(result.snapshot.incidents.source)}</p>
                  <p>
                    active count:{" "}
                    {result.snapshot.incidents.activeCount === null
                      ? "Unknown"
                      : result.snapshot.incidents.activeCount}
                  </p>
                </article>

                <article className={styles.card}>
                  <header className={styles.cardHeader}>
                    <h3>قواعد نمایش</h3>
                    <span className={styles.badge}>Canonical only</span>
                  </header>
                  <p>
                    UI مستقیماً provider یا health endpoint عمومی را probe نمی‌کند
                    و هیچ uptime، error-rate یا success-rate را از داده‌های ناقص
                    استنتاج نمی‌کند.
                  </p>
                </article>
              </section>
            </>
          )}

          <section
            className={styles.panel}
            aria-labelledby="operations-paths-title"
          >
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Canonical paths</p>
                <h3 id="operations-paths-title">
                  مسیرهای واقعی موجود در Command Center
                </h3>
              </div>
              <span className={styles.badge}>Server-authorized</span>
            </header>
            <p>
              این لینک‌ها فقط به workspaceهای موجود می‌روند؛ هیچ endpoint عملیاتی
              bypass یا direct browser probe ایجاد نشده است.
            </p>
            <div className={styles.linkList}>
              {canonicalPaths.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
