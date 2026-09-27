"use client";

import { ErrorState } from "@/src/components/ui";

type UserDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function UserDetailError({ error, reset }: UserDetailErrorProps) {
  return (
    <ErrorState
      title="نمای ۳۶۰ کاربر بارگذاری نشد"
      description={
        error.digest
          ? `اطلاعات کاربر نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "اطلاعات کاربر نمایش داده نشد. دادهٔ حدسی یا خصوصی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
