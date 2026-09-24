import Link from "next/link";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./organic-analytics.module.css";

export default async function OrganicCreativeAnalyticsPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Organic Creative Analytics"
        subtitle="یادگیری فقط از metricهای verified، هم‌معنا و به‌روز"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Creative learning · Unavailable</p>
              <h2>بدون metric canonical، reach یا «برنده»ی creative را حدس نمی‌زنیم.</h2>
              <p>
                هر مشاهده باید به post، creative و revision تأییدشده متصل باشد و definition،
                freshness، scope و محدودیت مقایسه را همراه خود داشته باشد. دادهٔ null هرگز صفر یا
                سیگنال موفقیت نیست.
              </p>
            </div>
            <Link className={styles.backLink} href="/marketing">
              بازگشت به Marketing
            </Link>
          </header>

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : (
            <AdminPageState
              state="unavailable"
              title="Organic Creative Analytics به provider metrics canonical متصل نیست"
              description="برای metricهای verified، semantics، freshness، comparable scope و observationهای امن، قرارداد server-side لازم است. درخواست قرارداد: #391."
            />
          )}

          <section className={styles.boundary} aria-label="مرزهای ایمنی تحلیل creative ارگانیک">
            <strong>مرزهای تحلیل قابل اتکا</strong>
            <ul>
              <li>
                Null صفر نیست؛ metric unavailable یا not instrumented به توصیهٔ performance تبدیل
                نمی‌شود.
              </li>
              <li>مقایسه فقط با definition، window، sample size و scope هم‌معنا مجاز است.</li>
              <li>
                Observationهای manual یا stale صرفاً provenance خود را نشان می‌دهند و verified
                نیستند.
              </li>
            </ul>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
