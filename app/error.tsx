"use client";

import Link from "next/link";

import styles from "./standalone-state.module.css";

export default function CommandCenterError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="error-title" role="alert">
        <span className={styles.code} aria-hidden="true">
          !
        </span>
        <h1 id="error-title">مرکز فرماندهی موقتاً در دسترس نیست.</h1>
        <p>
          برای حفظ امنیت، در صورت خطای Auth یا Admin API به داده مستقیم دیتابیس fallback نمی‌کنیم.
          می‌توانید دوباره تلاش کنید؛ اگر خطا ادامه داشت، وضعیت سرویس باید از مسیر عملیاتی بررسی شود.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={reset}>
            تلاش دوباره
          </button>
          <Link className={styles.secondary} href="/login">
            بازگشت به ورود امن
          </Link>
        </div>
      </section>
    </main>
  );
}
