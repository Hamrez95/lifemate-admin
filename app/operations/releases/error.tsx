"use client";

import { ErrorState } from "@/src/components/ui";

type OperationsReleasesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OperationsReleasesError({ error, reset }: OperationsReleasesErrorProps) {
  return (
    <ErrorState
      title="انتشارهای محصول بارگذاری نشدند"
      description={
        error.digest
          ? `اطلاعات انتشار نمایش داده نشد. هیچ وضعیت rollout یا adoption حدسی جایگزین نمی‌شود. شناسه رخداد: ${error.digest}`
          : "اطلاعات انتشار نمایش داده نشد. هیچ وضعیت rollout یا adoption حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
