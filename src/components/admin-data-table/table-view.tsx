import type { ReactNode } from "react";

import { AdminPageState, type AdminPageStateKind } from "./admin-page-state";
import { AdminPagination, type AdminPaginationProps } from "./admin-pagination";
import styles from "./admin-data-table.module.css";

export type AdminTableState = "ready" | AdminPageStateKind;

export type AdminTableColumn<Row> = {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  mobileLabel?: ReactNode;
  align?: "start" | "center" | "end";
  hideOnMobile?: boolean;
};

export type AdminDataTableProps<Row> = {
  title: string;
  description?: string;
  rows: readonly Row[];
  columns: readonly AdminTableColumn<Row>[];
  rowKey: (row: Row) => string;
  state?: AdminTableState;
  stateTitle?: string;
  stateDescription?: string;
  total?: number;
  pagination?: AdminPaginationProps;
  toolbar?: ReactNode;
  freshness?: { status: "fresh" | "stale" | "unknown"; label: string };
};

function renderValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined || value === "") {
    return (
      <span className={styles.unavailableValue} aria-label="ناموجود">
        —
      </span>
    );
  }
  return value;
}

export function AdminDataTable<Row>({
  title,
  description,
  rows,
  columns,
  rowKey,
  state = "ready",
  stateTitle,
  stateDescription,
  total,
  pagination,
  toolbar,
  freshness,
}: AdminDataTableProps<Row>) {
  const effectiveState: AdminTableState = state === "ready" && rows.length === 0 ? "empty" : state;
  const resultCount = typeof total === "number" ? total.toLocaleString("fa-IR") : "—";

  return (
    <section className={styles.root} aria-label={title}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {description ? <p className={styles.description}>{description}</p> : null}
          <p className={styles.resultCount}>تعداد نتیجه: {resultCount}</p>
        </div>
        {freshness ? (
          <span className={styles.freshness} data-status={freshness.status}>
            {freshness.label}
          </span>
        ) : null}
      </header>

      {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}

      {effectiveState !== "ready" ? (
        <AdminPageState state={effectiveState} title={stateTitle} description={stateDescription} />
      ) : (
        <>
          <div className={styles.desktopTable}>
            <div className={styles.scroller} tabIndex={0} aria-label={`جدول ${title}`}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>{title}</caption>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} scope="col" data-align={column.align ?? "start"}>
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={rowKey(row)}>
                      {columns.map((column) => (
                        <td key={column.key} data-align={column.align ?? "start"}>
                          {renderValue(column.render(row))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileCards} aria-label={`${title} در نمایش موبایل`}>
            {rows.map((row) => (
              <article className={styles.mobileCard} key={rowKey(row)}>
                <dl>
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div className={styles.mobileField} key={column.key}>
                        <dt>{column.mobileLabel ?? column.header}</dt>
                        <dd>{renderValue(column.render(row))}</dd>
                      </div>
                    ))}
                </dl>
              </article>
            ))}
          </div>
        </>
      )}

      {effectiveState === "ready" && pagination ? (
        <AdminPagination {...pagination} total={pagination.total ?? total} />
      ) : null}
    </section>
  );
}
