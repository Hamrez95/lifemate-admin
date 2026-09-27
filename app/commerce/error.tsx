"use client";

import { ErrorState } from "@/src/components/ui";

type CommerceErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CommerceError({ error, reset }: CommerceErrorProps) {
  return (
    <ErrorState
      title="مرکز تجارت بارگذاری نشد"
      description={
        error.digest
          ? `مرکز تجارت نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "اطلاعات تجارت نمایش داده نشد. قیمت یا دسترسی حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
