import type { ReactNode } from "react";

import styles from "./design-system.module.css";

type DataTableProps = {
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly ReactNode[])[];
};

export function DataTable({ caption, headers, rows }: DataTableProps) {
  return (
    <section className={styles.tableCard}>
      <div className={styles.tableScroller}>
        <table className={styles.table}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
