import type { ReactNode } from "react";

import styles from "./design-system.module.css";

type StateCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
  busy?: boolean;
  role?: "status" | "alert";
};

export function StateCard({
  icon,
  title,
  description,
  actions,
  busy = false,
  role,
}: StateCardProps) {
  return (
    <section className={styles.stateCard} aria-busy={busy || undefined} role={role}>
      <div className={styles.stateInner}>
        <span className={styles.stateIcon} aria-hidden="true">
          {icon}
        </span>
        <h2 className={styles.stateTitle}>{title}</h2>
        <p className={styles.stateDescription}>{description}</p>
        {actions ? <div className={styles.stateActions}>{actions}</div> : null}
      </div>
    </section>
  );
}
