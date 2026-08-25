import { LoadingState } from "@/src/components/ui/LoadingState";

import styles from "./standalone-state.module.css";

export default function Loading() {
  return (
    <main className={styles.loadingPage} aria-busy="true" aria-live="polite">
      <LoadingState />
    </main>
  );
}
