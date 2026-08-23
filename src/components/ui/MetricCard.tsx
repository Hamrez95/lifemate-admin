import type { ReactNode } from "react";

import styles from "./design-system.module.css";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
};

export function MetricCard({ label, value, meta, children }: MetricCardProps) {
  return (
    <article className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      {meta ? <span className={styles.metricMeta}>{meta}</span> : null}
      {children}
    </article>
  );
}
