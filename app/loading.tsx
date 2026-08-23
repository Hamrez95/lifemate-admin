import styles from "./standalone-state.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.card} aria-labelledby="loading-title">
        <span className={styles.code} aria-hidden="true">
          LM
        </span>
        <h1 id="loading-title">در حال بارگذاری…</h1>
        <div className={styles.status}>
          <span className={styles.spinner} aria-hidden="true" />
          <span>لطفاً یک لحظه صبر کنید؛ هیچ داده‌ای تا تأیید امنیتی نمایش داده نمی‌شود.</span>
        </div>
      </section>
    </main>
  );
}
