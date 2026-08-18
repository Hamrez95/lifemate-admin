import Link from "next/link";

import styles from "./offline.module.css";

export const metadata = {
  title: "اتصال قطع است",
};

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="offline-title">
        <div className={styles.mark} aria-hidden="true">
          LM
        </div>
        <p className={styles.eyebrow}>LifeMate Command Center · Secure PWA</p>
        <h1 id="offline-title">اتصال به Command Center برقرار نیست</h1>
        <p>
          برای حفاظت از اطلاعات مدیریتی، پنل هیچ صفحه، گزارش، نشست یا پاسخ API را برای استفاده
          آفلاین ذخیره نمی‌کند. پس از بازگشت اتصال، صفحه را دوباره بارگذاری کنید.
        </p>
        <div className={styles.safety}>
          <span aria-hidden="true">✓</span>
          <div>
            <strong>داده حساس روی این صفحه وجود ندارد</strong>
            <small>Offline shell فقط وضعیت اتصال را نمایش می‌دهد.</small>
          </div>
        </div>
        <Link className={styles.retry} href="/">
          تلاش دوباره
        </Link>
      </section>
    </main>
  );
}
