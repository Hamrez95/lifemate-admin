"use client";

import Link from "next/link";

import { ErrorState } from "@/src/components/ui/ErrorState";

import styles from "./standalone-state.module.css";

export default function CommandCenterError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page} role="alert">
      <ErrorState
        title="مرکز فرماندهی بارگذاری نشد"
        description="دوباره تلاش کنید؛ fallback مستقیم به دیتابیس انجام نمی‌شود."
        actions={
          <>
            <button className={styles.primary} type="button" onClick={reset}>
              تلاش دوباره
            </button>
            <Link className={styles.secondary} href="/login">
              ورود امن
            </Link>
          </>
        }
      />
    </main>
  );
}
