"use client";

import styles from "./finance.module.css";

type FinanceErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FinanceError({ error, reset }: FinanceErrorProps) {
  return (
    <div className={styles.page}>
      <section className={styles.stateBanner} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">!</span>
        <div>
          <strong>گزارش مالی بارگذاری نشد.</strong>
          <p>
            هیچ عدد جایگزین یا cache حدسی نمایش داده نشده است. دوباره تلاش کنید؛ در صورت تداوم خطا
            شناسه رخداد را برای بررسی نگه دارید.
          </p>
          {error.digest ? <p>شناسه رخداد: {error.digest}</p> : null}
          <div className={styles.filterActions}>
            <button type="button" onClick={reset}>تلاش دوباره</button>
          </div>
        </div>
      </section>
    </div>
  );
}
