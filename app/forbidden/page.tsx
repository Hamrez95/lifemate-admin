import Link from "next/link";

import { ForbiddenState } from "@/src/components/ui/ForbiddenState";

import styles from "../standalone-state.module.css";

export default function ForbiddenPage() {
  return (
    <main className={styles.page}>
      <ForbiddenState
        actions={
          <>
            <Link className={styles.primary} href="/">
              بازگشت به مرکز فرماندهی
            </Link>
            <Link className={styles.secondary} href="/profile">
              وضعیت امنیت حساب
            </Link>
          </>
        }
      />
    </main>
  );
}
