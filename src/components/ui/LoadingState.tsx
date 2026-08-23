import styles from "./design-system.module.css";

export function LoadingState({ title = "در حال بارگذاری…" }: { title?: string }) {
  return (
    <section className={styles.stateCard} aria-busy="true" aria-live="polite">
      <div className={styles.stateInner}>
        <span className={styles.spinner} aria-hidden="true" />
        <h2 className={styles.stateTitle}>{title}</h2>
        <p className={styles.stateDescription}>
          تا تأیید نشست امن و پاسخ معتبر Admin API، هیچ داده‌ای نمایش داده نمی‌شود.
        </p>
      </div>
    </section>
  );
}
