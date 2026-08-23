import Link from "next/link";

import styles from "./design-system.module.css";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  sectionLabel?: string;
};

export function PageHeader({ title, subtitle, sectionLabel = "مرکز فرماندهی" }: PageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
        <Link href="/">LifeMate</Link>
        <span className={styles.breadcrumbSeparator} aria-hidden="true">/</span>
        <span>{sectionLabel}</span>
        {title !== sectionLabel ? (
          <>
            <span className={styles.breadcrumbSeparator} aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </>
        ) : null}
      </nav>
      <h1 className={styles.pageTitle}>{title}</h1>
      {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
    </div>
  );
}
