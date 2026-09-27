"use client";

import { ErrorState } from "@/src/components/ui";

type SupportErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SupportError({ error, reset }: SupportErrorProps) {
  return (
    <ErrorState
      title="صف پشتیبانی بارگذاری نشد"
      description={
        error.digest
          ? `صف پشتیبانی نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "صف پشتیبانی نمایش داده نشد. هیچ تیکت یا وضعیت حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
