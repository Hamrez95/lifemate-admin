"use client";

import { ErrorState } from "@/src/components/ui";

type CocoonErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CocoonError({ error, reset }: CocoonErrorProps) {
  return (
    <ErrorState
      title="مرکز CocoonMate بارگذاری نشد"
      description={
        error.digest
          ? `اطلاعات CocoonMate نمایش داده نشد. هیچ وضعیت آماده‌سازی یا rollout حدسی جایگزین نمی‌شود. شناسه رخداد: ${error.digest}`
          : "اطلاعات CocoonMate نمایش داده نشد. هیچ وضعیت آماده‌سازی یا rollout حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
