import { LoadingState } from "@/src/components/ui/LoadingState";

import styles from "./standalone-state.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-live="polite">
      <LoadingState title="در حال بارگذاری مرکز فرماندهی…" />
    </main>
  );
}
