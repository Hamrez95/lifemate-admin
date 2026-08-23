import { LoadingState } from "@/src/components/ui/LoadingState";

import styles from "./standalone-state.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-live="polite">
      <span className="sr-only">هیچ داده‌ای تا تأیید امنیتی نمایش داده نمی‌شود.</span>
      <LoadingState title="در حال بارگذاری مرکز فرماندهی…" />
    </main>
  );
}
