"use client";

import { ErrorState } from "@/src/components/ui";

type CocoonReadinessErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CocoonReadinessError({ error, reset }: CocoonReadinessErrorProps) {
  return (
    <ErrorState
      title="گیت آمادگی CocoonMate بارگذاری نشد"
      description={
        error.digest
          ? `گزارش آمادگی نمایش داده نشد. هیچ نتیجه readiness یا parity حدسی جایگزین نمی‌شود. شناسه رخداد: ${error.digest}`
          : "گزارش آمادگی نمایش داده نشد. هیچ نتیجه readiness یا parity حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
