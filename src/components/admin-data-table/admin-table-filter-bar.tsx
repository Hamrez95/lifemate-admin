import type { ReactNode } from "react";

import styles from "./admin-data-table.module.css";

export function AdminTableFilterBar({
  action,
  children,
  clearHref,
  submitLabel = "اعمال فیلترها",
  ariaLabel = "فیلترهای جدول",
}: {
  action?: string;
  children: ReactNode;
  clearHref?: string;
  submitLabel?: string;
  ariaLabel?: string;
}) {
  return (
    <form
      className={styles.filterBar}
      action={action}
      method="get"
      role="search"
      aria-label={ariaLabel}
    >
      <div className={styles.filterFields}>{children}</div>
      <div className={styles.filterActions}>
        <button className={styles.primaryButton} type="submit">
          {submitLabel}
        </button>
        {clearHref ? (
          <a className={styles.secondaryButton} href={clearHref}>
            پاک کردن
          </a>
        ) : null}
      </div>
    </form>
  );
}
