"use client";

import { ErrorState } from "@/src/components/ui";

type CommerceCatalogErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CommerceCatalogError({ error, reset }: CommerceCatalogErrorProps) {
  return (
    <ErrorState
      title="کاتالوگ تجارت بارگذاری نشد"
      description={
        error.digest
          ? `کاتالوگ تجارت نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "کاتالوگ نمایش داده نشد. قیمت یا وضعیت دسترسی حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
