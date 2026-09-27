"use client";

import { ErrorState } from "@/src/components/ui";

type MarketingChannelsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MarketingChannelsError({ error, reset }: MarketingChannelsErrorProps) {
  return (
    <ErrorState
      title="کانال‌های بازاریابی بارگذاری نشدند"
      description={
        error.digest
          ? `کانال‌های بازاریابی نمایش داده نشدند. شناسه رخداد: ${error.digest}`
          : "کانال‌ها نمایش داده نشدند. اتصال یا وضعیت ساختگی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
