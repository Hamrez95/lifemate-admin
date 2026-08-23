import styles from "./standalone-state.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.card} aria-labelledby="loading-title">
        <span className={styles.code} aria-hidden="true">
          LM
        </span>
        <h1 id="loading-title">در حال آماده‌سازی مرکز فرماندهی</h1>
        <p>
          در حال بررسی نشست امن و دریافت داده‌های مجاز هستیم. تا زمان دریافت پاسخ معتبر، هیچ داده
          فرضی یا مستقیم از دیتابیس نمایش داده نمی‌شود.
        </p>
        <div className={styles.status}>
          <span className={styles.spinner} aria-hidden="true" />
          <span>در حال بارگذاری امن…</span>
        </div>
      </section>
    </main>
  );
}
