"use client";

import { ErrorState } from "@/src/components/ui";

type RelationshipsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RelationshipsError({ error, reset }: RelationshipsErrorProps) {
  return (
    <ErrorState
      title="روابط و وضعیت رضایت بارگذاری نشد"
      description={
        error.digest
          ? `داده روابط نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "داده روابط نمایش داده نشد. هیچ رابطه، رضایت یا مجوز دسترسی حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
