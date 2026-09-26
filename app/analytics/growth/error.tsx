"use client";

import { ErrorState } from "@/src/components/ui";

type GrowthErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GrowthError({ error, reset }: GrowthErrorProps) {
  return (
    <ErrorState
      title="تحلیل رشد بارگذاری نشد"
      description={
        error.digest
          ? `دادهٔ رشد نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "دادهٔ رشد نمایش داده نشد. هیچ KPI حدسی یا صفر جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
