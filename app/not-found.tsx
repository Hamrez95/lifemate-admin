import Link from "next/link";

import styles from "./standalone-state.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="not-found-title">
        <span className={styles.code} aria-hidden="true">
          404
        </span>
        <h1 id="not-found-title">این بخش در مرکز فرماندهی پیدا نشد.</h1>
        <p>
          آدرس ممکن است تغییر کرده باشد یا این مسیر در Command Center تعریف نشده باشد. هیچ داده‌ای
          برای پر کردن این صفحه حدس زده نمی‌شود.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/">
            بازگشت به مرکز فرماندهی
          </Link>
        </div>
      </section>
    </main>
  );
}
