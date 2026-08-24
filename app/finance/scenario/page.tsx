import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../finance.module.css";

export default async function FinanceScenarioPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("finance.read")) redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="finance"
        title="مالی"
        subtitle="Scenario planning فقط پس از قرارداد canonical و endpoint معتبر"
      >
        <div className={styles.page}>
          <section
            className={`${styles.hero} ${styles.financeHero}`}
            aria-labelledby="scenario-title"
          >
            <div className={styles.heroCopy}>
              <p className="eyebrow">ADM-FIN-003 · Scenario planning</p>
              <h2 id="scenario-title">سناریوهای مالی</h2>
              <p>
                این workspace برای مقایسه سناریوهای مالی طراحی شده است، اما هیچ فرض، forecast یا
                تغییر مالی در مرورگر ساخته یا ذخیره نمی‌شود. ثبت سناریو تا زمان وجود endpoint معتبر
                Core غیرفعال است.
              </p>
              <nav className={styles.heroActions} aria-label="ناوبری مالی">
                <Link href="/finance">نمای کلی</Link>
                <Link href="/finance/budget">Budget vs Actual</Link>
              </nav>
            </div>
            <div className={styles.heroArtwork} aria-hidden="true" />
          </section>

          <section className={styles.stateBanner} role="status" aria-live="polite">
            <span className={styles.stateIcon} aria-hidden="true">
              !
            </span>
            <div>
              <strong>Scenario API · Unavailable</strong>
              <p>
                قرارداد فعلی Finance فقط P&amp;L canonical و Budget vs Actual را ارائه می‌کند. تا
                وقتی endpoint رسمی برای read/write سناریو، versioning، audit و idempotency تعریف
                نشود، ساخت، ویرایش و ذخیره سناریو در دسترس نیست.
              </p>
            </div>
          </section>

          <section className={styles.scenarioGrid} aria-label="ساختار سناریوهای مالی">
            <article className={styles.scenarioCard}>
              <span className={styles.badge}>BASELINE</span>
              <h3>Baseline canonical</h3>
              <strong>—</strong>
              <p>هیچ baseline از Actual یا Budget استنباط نمی‌شود؛ منبع scenario مستقل لازم است.</p>
            </article>
            <article className={styles.scenarioCard}>
              <span className={styles.badge}>ASSUMPTIONS</span>
              <h3>فرض‌ها و متغیرها</h3>
              <strong>Unavailable</strong>
              <p>ورودی مالی editable بدون قرارداد validation و persistence نمایش داده نمی‌شود.</p>
            </article>
            <article className={styles.scenarioCard}>
              <span className={styles.badge}>FORECAST</span>
              <h3>خروجی سناریو</h3>
              <strong>—</strong>
              <p>هیچ revenue، expense، runway یا forecast ساختگی محاسبه یا رسم نمی‌شود.</p>
            </article>
          </section>

          <section className={styles.panel} aria-labelledby="scenario-contract-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Write boundary</p>
                <h3 id="scenario-contract-title">ثبت تغییر مالی قفل است</h3>
              </div>
              <span className={styles.unavailable}>Unavailable</span>
            </header>
            <div className={styles.contractChecklist}>
              <p>
                <strong>Read model:</strong> قرارداد canonical سناریو لازم است.
              </p>
              <p>
                <strong>Write endpoint:</strong> endpoint معتبر با permission، reason، audit و
                idempotency لازم است.
              </p>
              <p>
                <strong>Currency:</strong> currency و minor-unit exponent باید از Core بیاید؛ FX حدس
                زده نمی‌شود.
              </p>
              <p>
                <strong>Timezone:</strong> timestampهای مالی در UI با Asia/Tehran نمایش داده می‌شوند
                و source UTC حفظ می‌شود.
              </p>
            </div>
            <button className={styles.disabledAction} type="button" disabled>
              ذخیره سناریو — در دسترس نیست
            </button>
          </section>

          <section className={styles.exportUnavailable} aria-label="وضعیت خروجی سناریو">
            <strong>Export · Unavailable</strong>
            <p>
              برای Scenario قرارداد export وجود ندارد؛ فایل client-side از داده ناقص ساخته نمی‌شود.
            </p>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
