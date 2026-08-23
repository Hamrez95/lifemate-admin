import type { ReactNode } from "react";

import styles from "./design-system.module.css";

type AppShellProps = {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div className={styles.appShell}>
      {sidebar}
      <div className={styles.content}>
        {header}
        {children}
      </div>
    </div>
  );
}
