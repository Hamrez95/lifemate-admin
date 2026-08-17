import styles from "./finance.module.css";

export default function FinanceLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.stateBanner} role="status">
        <span className={styles.stateIcon} aria-hidden="true">
          …
        </span>
        <div>
          <strong>در حال بارگذاری گزارش مالی…</strong>
          <p>Actual، Forecast و وضعیت freshness پس از تأیید read model نمایش داده می‌شوند.</p>
        </div>
      </section>
    </div>
  );
}
