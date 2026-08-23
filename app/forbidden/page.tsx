import Link from "next/link";

import styles from "../standalone-state.module.css";

export default function ForbiddenPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="forbidden-title">
        <span className={styles.code} aria-hidden="true">
          403
        </span>
        <h1 id="forbidden-title">برای این بخش دسترسی ندارید.</h1>
        <p>
          دسترسی Command Center فقط با عضویت فعال، سطح دسترسی لازم و کنترل‌های امنیتی سمت سرور
          برقرار می‌شود. ورود موفق یا دیده‌شدن یک منو به‌تنهایی مجوز دسترسی ایجاد نمی‌کند.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/">
            بازگشت به مرکز فرماندهی
          </Link>
          <Link className={styles.secondary} href="/profile">
            بررسی وضعیت امنیت حساب
          </Link>
        </div>
      </section>
    </main>
  );
}
