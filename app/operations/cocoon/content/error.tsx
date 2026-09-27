"use client";

import { ErrorState } from "@/src/components/ui";

type CocoonContentErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CocoonContentError({ error, reset }: CocoonContentErrorProps) {
  return (
    <ErrorState
      title="محتوای CocoonMate بارگذاری نشد"
      description={
        error.digest
          ? `محتوای CocoonMate نمایش داده نشد. هیچ محتوای پزشکی یا انتشار حدسی جایگزین نمی‌شود. شناسه رخداد: ${error.digest}`
          : "محتوای CocoonMate نمایش داده نشد. هیچ محتوای پزشکی یا انتشار حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
