import styles from "./advisor.module.css";

export default function AiLoading() {
  return (
    <div className={styles.loadingPanel} role="status" aria-live="polite">
      <span className={styles.loadingDot} aria-hidden="true" />
      <strong>در حال دریافت پاسخ امن…</strong>
    </div>
  );
}
