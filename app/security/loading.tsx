import styles from "./security.module.css";

export default function SecurityLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <section className={styles.stateBanner} role="status">
        <span aria-hidden="true">…</span>
        <div>
          <strong>در حال دریافت ماتریس نقش و مجوز…</strong>
          <p>نقش‌ها و permissionها فقط از Admin API canonical بارگذاری می‌شوند.</p>
        </div>
      </section>
    </div>
  );
}
