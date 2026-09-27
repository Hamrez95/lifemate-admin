"use client";

import { ErrorState } from "@/src/components/ui";

type MarketingErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MarketingError({ error, reset }: MarketingErrorProps) {
  return (
    <ErrorState
      title="مرکز بازاریابی بارگذاری نشد"
      description={
        error.digest
          ? `مرکز بازاریابی نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "اطلاعات بازاریابی نمایش داده نشد. اتصال یا نتیجهٔ حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
