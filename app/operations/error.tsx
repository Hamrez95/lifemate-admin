"use client";

import { ErrorState } from "@/src/components/ui";

type OperationsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OperationsError({ error, reset }: OperationsErrorProps) {
  return (
    <ErrorState
      title="مرکز عملیات بارگذاری نشد"
      description={
        error.digest
          ? `اطلاعات عملیات نمایش داده نشد. هیچ وضعیت deployment یا parity حدسی جایگزین نمی‌شود. شناسه رخداد: ${error.digest}`
          : "اطلاعات عملیات نمایش داده نشد. هیچ وضعیت deployment یا parity حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
