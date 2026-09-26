"use client";

import { ErrorState } from "@/src/components/ui";

type ProfileErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProfileError({ error, reset }: ProfileErrorProps) {
  return (
    <ErrorState
      title="پروفایل و امنیت بارگذاری نشد"
      description={
        error.digest
          ? `اطلاعات امنیتی نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "اطلاعات امنیتی نمایش داده نشد. دوباره تلاش کنید؛ هیچ وضعیت حدسی نمایش داده نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
