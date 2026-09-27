"use client";

import { ErrorState } from "@/src/components/ui";

type SecurityErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SecurityError({ error, reset }: SecurityErrorProps) {
  return (
    <ErrorState
      title="ماتریس امنیت بارگذاری نشد"
      description={
        error.digest
          ? `ماتریس نقش و مجوز نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "ماتریس نقش و مجوز نمایش داده نشد. هیچ نقش یا permission حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
