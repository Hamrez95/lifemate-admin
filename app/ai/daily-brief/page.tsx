import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getDailyBrief } from "@/src/lib/admin-api/ai-daily-brief";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../advisor.module.css";

function BriefColumn({
  label,
  items,
  empty,
}: {
  label: string;
  items: { id: string; title: string; detail: string }[];
  empty: string;
}) {
  return (
    <article className={styles.briefCard}>
      <span>{label}</span>
      {items.length === 0 ? (
        <>
          <h4>موردی ثبت نشده است</h4>
          <p>{empty}</p>
        </>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            <h4>{item.title}</h4>
            <p>{item.detail}</p>
          </div>
        ))
      )}
    </article>
  );
}

export default async function AiDailyBriefPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("ai.business.read")) redirect("/forbidden");
  const result = await getDailyBrief();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

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
              <p className={styles.eyebrow}>Executive Daily Brief · Evidence first</p>
              <h2>تصویر کوتاه کسب‌وکار، فقط بر پایه شواهد canonical و freshness قابل مشاهده.</h2>
              <p>
                تغییرات، موارد نیازمند توجه و اقدام‌های پیشنهادی مستقیماً از قرارداد read-only Core
                می‌آیند. UI هیچ KPI، trend، خلاصه یا توصیه جایگزینی تولید نمی‌کند.
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

          {result.kind === "unavailable" ? (
            <section className={styles.unavailablePanel} aria-labelledby="brief-unavailable-title">
              <span className={styles.unavailableIcon} aria-hidden="true">
                ◇
              </span>
              <div>
                <p className={styles.eyebrow}>Core contract</p>
                <h3 id="brief-unavailable-title">Daily Brief فعلاً در دسترس نیست</h3>
                <p>
                  هیچ summary جایگزین ساخته نمی‌شود.
                  {result.correlationId ? ` کد پیگیری: ${result.correlationId}` : ""}
                </p>
              </div>
            </section>
          ) : (
            <>
              <section className={styles.briefPanel} aria-labelledby="daily-pulse-title">
                <div className={styles.briefHead}>
                  <div>
                    <span className={styles.eyebrow}>Canonical daily pulse</span>
                    <h3 id="daily-pulse-title">پالس اجرایی</h3>
                  </div>
                  <span className={styles.safeBadge}>وضعیت: {result.brief.state}</span>
                </div>

                <div className={styles.briefGrid}>
                  <BriefColumn
                    label="تغییرات کلیدی"
                    items={result.brief.changes}
                    empty="Core شواهد مقایسه‌ای کافی برای اعلام تغییر برنگردانده است."
                  />
                  <BriefColumn
                    label="نیازمند توجه"
                    items={result.brief.attention}
                    empty="مورد نیازمند توجه در شواهد canonical فعلی ثبت نشده است."
                  />
                  <BriefColumn
                    label="اقدام‌های پیشنهادی"
                    items={result.brief.actions}
                    empty="اقدام پیشنهادی مبتنی بر شواهد در دسترس نیست."
                  />
                </div>
              </section>

              <section className={styles.unavailablePanel} aria-labelledby="brief-evidence-title">
                <span className={styles.unavailableIcon} aria-hidden="true">
                  ✦
                </span>
                <div>
                  <p className={styles.eyebrow}>Evidence & freshness</p>
                  <h3 id="brief-evidence-title">{result.brief.evidence.length} منبع قابل ردیابی</h3>
                  <p>
                    تولید در{" "}
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Tehran",
                    }).format(new Date(result.brief.generatedAtUtc))}
                    . هر caveat منبع در contract حفظ می‌شود و UI آن را با داده فرضی جایگزین نمی‌کند.
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
