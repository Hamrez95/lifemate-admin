"use client";

import Link from "next/link";

import { ErrorState } from "@/src/components/ui/ErrorState";

import styles from "./standalone-state.module.css";

export default function CommandCenterError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <ErrorState
        title="مرکز فرماندهی موقتاً در دسترس نیست."
        description="برای حفظ امنیت، در صورت خطای Auth یا Admin API به داده مستقیم دیتابیس fallback نمی‌کنیم. می‌توانید دوباره تلاش کنید؛ اگر خطا ادامه داشت، وضعیت سرویس باید از مسیر عملیاتی بررسی شود."
        actions={
          <>
            <button className={styles.primary} type="button" onClick={reset}>
              تلاش دوباره
            </button>
            <Link className={styles.secondary} href="/login">
              بازگشت به ورود امن
            </Link>
          </>
        }
      />
    </main>
  );
}
