"use client";

import { ErrorState } from "@/src/components/ui";

type SettingsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SettingsError({ error, reset }: SettingsErrorProps) {
  return (
    <ErrorState
      title="تنظیمات بارگذاری نشد"
      description={
        error.digest
          ? `تنظیمات canonical نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "تنظیمات canonical نمایش داده نشد. دوباره تلاش کنید؛ مقدار ساختگی نمایش داده نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
