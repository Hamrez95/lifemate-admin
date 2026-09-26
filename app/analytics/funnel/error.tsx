"use client";

import { ErrorState } from "@/src/components/ui";

type FunnelErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function FunnelError({ error, reset }: FunnelErrorProps) {
  return (
    <ErrorState
      title="تحلیل قیف بارگذاری نشد"
      description={
        error.digest
          ? `دادهٔ قیف نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "دادهٔ قیف نمایش داده نشد. هیچ نرخ یا KPI حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
