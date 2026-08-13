import { getTotalPages } from "./table-query";
import styles from "./admin-data-table.module.css";

export type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total?: number;
  previousHref?: string;
  nextHref?: string;
  ariaLabel?: string;
};

export function AdminPagination({
  page,
  pageSize,
  total,
  previousHref,
  nextHref,
  ariaLabel = "صفحه‌بندی جدول",
}: AdminPaginationProps) {
  const safePage = Math.max(1, page);
  const totalPages = typeof total === "number" ? getTotalPages(total, pageSize) : undefined;

  return (
    <nav className={styles.pagination} aria-label={ariaLabel}>
      {previousHref ? (
        <a className={styles.pageButton} href={previousHref} rel="prev">
          صفحه قبل
        </a>
      ) : (
        <span className={styles.pageButtonDisabled} aria-disabled="true">
          صفحه قبل
        </span>
      )}

      <span className={styles.pageStatus}>
        صفحه {safePage.toLocaleString("fa-IR")} از{" "}
        {totalPages ? totalPages.toLocaleString("fa-IR") : "—"}
      </span>

      {nextHref ? (
        <a className={styles.pageButton} href={nextHref} rel="next">
          صفحه بعد
        </a>
      ) : (
        <span className={styles.pageButtonDisabled} aria-disabled="true">
          صفحه بعد
        </span>
      )}
    </nav>
  );
}
