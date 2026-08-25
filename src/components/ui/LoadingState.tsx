import styles from "./design-system.module.css";

export function LoadingState({ title = "در حال بارگذاری…" }: { title?: string }) {
  return (
    <section
      className={styles.stateCard}
      aria-busy="true"
      aria-live="polite"
      aria-label="در حال بارگذاری از Admin API"
    >
      <div className={styles.stateInner}>
        <div className={styles.loadingSkeleton} aria-hidden="true">
          <span />
          <span />
        </div>
        <h2 className={styles.stateTitle}>{title}</h2>
      </div>
    </section>
  );
}
