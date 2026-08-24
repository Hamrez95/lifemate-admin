import Image from "next/image";
import Link from "next/link";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../advisor.module.css";

export default async function AiDailyBriefPage() {
  const admin = await requireAdminAccess();
  const canReadBusinessAi = admin.permissions.includes("ai.business.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="ai"
        title="AI Daily Brief"
        subtitle="گزارش اجرایی روزانه فقط از قرارداد canonical Core"
      >
        <main className={styles.page}>
          <nav className={styles.aiTabs} aria-label="بخش‌های هوش مصنوعی">
            <Link href="/ai/daily-brief" aria-current="page">
              گزارش روزانه
            </Link>
            <Link href="/ai">مشاور هوشمند</Link>
          </nav>

          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Executive Daily Brief · Safe by default</p>
              <h2>
                صبح را با یک تصویر کوتاه از کسب‌وکار شروع کنید؛ فقط وقتی Core آن را تأیید کرده باشد.
              </h2>
              <p>
                چیدمان از مرجع صفحه ۲ گرفته شده است: تغییرات کلیدی، موارد نیازمند توجه و اقدام‌های
                پیشنهادی. تا زمانی که قرارداد canonical مخصوص Daily Brief وجود نداشته باشد، هیچ
                خلاصه، KPI یا توصیه‌ای از سمت UI ساخته نمی‌شود.
              </p>
              <div className={styles.heroBadges}>
                <span>Canonical API only</span>
                <span>بدون داده سلامت خام</span>
                <span>بدون توصیه پزشکی</span>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <Image
                src="/design-assets/ai-advisor-hero-v1.png"
                alt="تصویر انتزاعی گزارش روزانه هوشمند LifeMate"
                width={720}
                height={560}
                sizes="(max-width: 760px) 78vw, 330px"
              />
            </div>
          </header>

          {!canReadBusinessAi ? (
            <section className={styles.unavailablePanel} aria-labelledby="brief-permission-title">
              <span className={styles.unavailableIcon} aria-hidden="true">
                ◇
              </span>
              <div>
                <p className={styles.eyebrow}>دسترسی محدود</p>
                <h3 id="brief-permission-title">گزارش روزانه برای این نقش قابل مشاهده نیست</h3>
                <p>مجوز ai.business.read برای مشاهده این سطح از داده کسب‌وکاری لازم است.</p>
              </div>
            </section>
          ) : (
            <>
              <section className={styles.briefPanel} aria-labelledby="daily-pulse-title">
                <div className={styles.briefHead}>
                  <div>
                    <span className={styles.eyebrow}>صبح امروز</span>
                    <h3 id="daily-pulse-title">پالس اجرایی</h3>
                  </div>
                  <span className={styles.safeBadge}>هیچ مقدار ساختگی نیست</span>
                </div>

                <div className={styles.briefGrid}>
                  <article className={styles.briefCard}>
                    <span>تغییرات کلیدی</span>
                    <h4>داده‌ای برای نمایش نداریم</h4>
                    <p>خلاصه روزانه فقط پس از اتصال قرارداد canonical نمایش داده می‌شود.</p>
                  </article>
                  <article className={styles.briefCard}>
                    <span>نیازمند توجه</span>
                    <h4>هشداری تولید نشده است</h4>
                    <p>UI از KPI یا رویدادهای دیگر هشدار استنتاج نمی‌کند.</p>
                  </article>
                  <article className={styles.briefCard}>
                    <span>اقدام‌های پیشنهادی</span>
                    <h4>پیشنهادی در دسترس نیست</h4>
                    <p>تا قرارداد Core وجود نداشته باشد، توصیه مدیریتی یا پزشکی ساخته نمی‌شود.</p>
                  </article>
                </div>
              </section>

              <section
                className={styles.unavailablePanel}
                aria-labelledby="brief-unavailable-title"
              >
                <span className={styles.unavailableIcon} aria-hidden="true">
                  ✦
                </span>
                <div>
                  <p className={styles.eyebrow}>Core contract</p>
                  <h3 id="brief-unavailable-title">
                    این قابلیت هنوز به قرارداد Core متصل نشده است
                  </h3>
                  <p>
                    به‌محض تعریف endpoint canonical برای Daily Brief، همین صفحه فقط داده تأییدشده را
                    نمایش خواهد داد. فعلاً هیچ summary جایگزین یا داده حساس نشان داده نمی‌شود.
                  </p>
                </div>
              </section>
            </>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
