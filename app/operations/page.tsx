import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../ops-settings.module.css";

const canonicalPaths = [
  { href: "/security/audit", label: "Audit و رخدادهای ثبت‌شده" },
  { href: "/support", label: "صف پشتیبانی و incidentهای کاربری" },
  { href: "/marketing/content-calendar", label: "اجرای انتشارهای canonical" },
  { href: "/finance", label: "read model مالی canonical" },
] as const;

const unavailableCards = [
  {
    title: "سلامت سرویس‌ها",
    description:
      "قرارداد canonical برای health، uptime، p95 یا error-rate سرویس‌ها در Admin API موجود نیست.",
  },
  {
    title: "وظایف پس‌زمینه",
    description:
      "قرارداد canonical برای job status، retry count یا last-run هنوز در دسترس این پنل نیست.",
  },
  {
    title: "انتشار و نسخه‌ها",
    description:
      "وضعیت deploy، rollout و rollback از UI حدس زده نمی‌شود تا operational visibility معتبر فراهم شود.",
  },
  {
    title: "یکپارچه‌سازی‌های خارجی",
    description:
      "وضعیت providerها، gatewayها یا سرویس‌های ثالث بدون endpoint قابل‌ردیابی نمایش داده نمی‌شود.",
  },
  {
    title: "رخداد فعال",
    description:
      "incident فعال یا severity ساختگی تولید نمی‌شود؛ تنها رخداد canonical پس از قرارداد مناسب نمایش داده خواهد شد.",
  },
  {
    title: "شاخص‌های عملیاتی",
    description:
      "availability، latency و success-rate تا زمان وجود read model واقعی با مقدار «در دسترس نیست» باقی می‌مانند.",
  },
] as const;

export default async function OperationsPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("operations.read")) redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="operations"
        title="عملیات"
        subtitle="مرکز مشاهده عملیات بدون تخمین وضعیت سرویس یا ساخت KPI"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="operations-title">
            <p className="eyebrow">ADM-OPS · Reference 17</p>
            <h2 id="operations-title">مرکز عملیات LifeMate</h2>
            <p>
              وضعیت سلامت، latency، job، deploy و incident فقط وقتی نمایش داده می‌شود که Admin API
              یک read model canonical و قابل‌ردیابی ارائه کند. نبود قرارداد به معنی «در دسترس نیست»
              است، نه سبز بودن سرویس.
            </p>
          </section>

          <section className={styles.banner} role="status" aria-live="polite">
            <span className={styles.bannerIcon} aria-hidden="true">
              i
            </span>
            <div>
              <strong>Operational visibility هنوز به قرارداد Core متصل نشده است.</strong>
              <p>
                این صفحه هیچ health check مستقیم از مرورگر اجرا نمی‌کند و هیچ سرویس، درصد uptime،
                latency یا incident فرضی نمایش نمی‌دهد.
              </p>
            </div>
          </section>

          <section className={styles.grid3} aria-label="وضعیت قابلیت‌های عملیاتی">
            {unavailableCards.map((card) => (
              <article key={card.title} className={styles.card}>
                <header className={styles.cardHeader}>
                  <h3>{card.title}</h3>
                  <span className={styles.badge}>Unavailable</span>
                </header>
                <p>{card.description}</p>
              </article>
            ))}
          </section>

          <section className={styles.panel} aria-labelledby="operations-paths-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Canonical paths</p>
                <h3 id="operations-paths-title">مسیرهای واقعی موجود در Command Center</h3>
              </div>
              <span className={styles.badge}>Server-authorized</span>
            </header>
            <p>
              این لینک‌ها فقط به workspaceهای موجود می‌روند؛ هیچ endpoint عملیاتی جدید یا bypass
              برای permission ساخته نشده است.
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
