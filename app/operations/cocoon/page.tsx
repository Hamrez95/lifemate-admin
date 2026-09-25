import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../../ops-settings.module.css";

const operationalDimensions = [
  {
    title: "Bootstrap و ورود",
    description: "موفقیت یا شکست فنی bootstrap، auth و enrollment بدون payload سلامت.",
    source: "Core #807 · Admin API read model",
  },
  {
    title: "نسخه و محیط",
    description: "توزیع نسخه، build، environment و سازگاری runtime/content/rule.",
    source: "Canonical release/runtime contract",
  },
  {
    title: "Reliability قابلیت‌ها",
    description: "کلاس خطای Home، Calendar، Quick Add، Records و Notification به‌صورت aggregate.",
    source: "Privacy-safe product-health events",
  },
  {
    title: "Support diagnostics",
    description: "Correlation ID، error class و وضعیت scheduler بدون پیوست health record.",
    source: "Core diagnostic contract",
  },
] as const;

const privacyRules = [
  "Cocoon entitlement به معنی باردار بودن کاربر نیست.",
  "Pregnancy status، هفته، EDD، outcome، symptom و measurement نمایش داده نمی‌شود.",
  "Medication، جزئیات appointment، child health و document content خارج از این workspace است.",
  "اگر read model معتبر موجود نباشد، وضعیت Unavailable باقی می‌ماند.",
] as const;

export default async function CocoonOperationsPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("operations.read")) redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="operations"
        title="CocoonMate Operations"
        subtitle="عملیات محصول و پشتیبانی فنی، بدون مشاهده‌ی داده‌ی خام بارداری"
      >
        <main className={styles.page}>
          <section className={styles.hero} aria-labelledby="cocoon-operations-title">
            <p className="eyebrow">COCOON · ADMIN-F1 · PRIVACY-MINIMIZED</p>
            <h2 id="cocoon-operations-title">مرکز عملیات CocoonMate</h2>
            <p>
              این صفحه برای پاسخ به سؤال‌های عملیاتی ساخته شده است: آیا محصول قابل‌دسترسی است؟
              bootstrap کجا شکست می‌خورد؟ کدام نسخه یا environment مشکل دارد؟ هیچ health payload یا
              وضعیت بارداری از این مسیر خوانده نمی‌شود.
            </p>
            <div className={styles.actions}>
              <Link href="/operations/cocoon/content">Clinical content governance</Link>
              <Link href="/support">رفتن به صف پشتیبانی</Link>
              <Link href="/commerce">وضعیت تجاری canonical</Link>
            </div>
          </section>

          <section className={styles.banner} role="status" aria-live="polite">
            <span className={styles.bannerIcon} aria-hidden="true">
              i
            </span>
            <div>
              <strong>Operational read model هنوز به Admin API متصل نیست.</strong>
              <p>
                داده‌ی ساختگی، شمارنده‌ی حدسی یا fallback مستقیم به جدول‌های سلامت ساخته نمی‌شود.
                بعد از آماده شدن قرارداد Core #807، همین کارت‌ها محل نمایش داده‌ی aggregate معتبر
                خواهند بود.
              </p>
            </div>
          </section>

          <section className={styles.grid2} aria-label="ابعاد عملیاتی CocoonMate">
            {operationalDimensions.map((item) => (
              <article key={item.title} className={styles.card}>
                <header className={styles.cardHeader}>
                  <h3>{item.title}</h3>
                  <span className={styles.badge}>Unavailable</span>
                </header>
                <p>{item.description}</p>
                <p className={styles.helper}>منبع مورد انتظار: {item.source}</p>
              </article>
            ))}
          </section>

          <section className={styles.panel} aria-labelledby="cocoon-privacy-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Privacy boundary</p>
                <h3 id="cocoon-privacy-title">مرز داده‌ای این workspace</h3>
              </div>
              <span className={styles.badge}>No raw health</span>
            </header>
            <ul className={styles.list}>
              {privacyRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          <AdminPageState
            state="unavailable"
            title="Cocoon product-health فعلاً instrument نشده است"
            description="برای فعال شدن این صفحه باید read model privacy-safe، capability اختصاصی و قرارداد diagnostics در Admin API/Core آماده و تست شود."
          />

          <section className={styles.panel} aria-labelledby="cocoon-paths-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Command Center paths</p>
                <h3 id="cocoon-paths-title">مسیرهای مرتبط و واقعی</h3>
              </div>
              <span className={styles.badge}>Server-authorized</span>
            </header>
            <div className={styles.linkList}>
              <Link href="/operations/cocoon/content">Clinical content governance</Link>
              <Link href="/operations/releases">Release و version adoption</Link>
              <Link href="/security/audit">Audit و رخدادهای قابل‌پیگیری</Link>
              <Link href="/commerce">Commerce و entitlement</Link>
            </div>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
