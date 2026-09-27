"use client";

import { ErrorState } from "@/src/components/ui";

type UsersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function UsersError({ error, reset }: UsersErrorProps) {
  return (
    <ErrorState
      title="فهرست کاربران بارگذاری نشد"
      description={
        error.digest
          ? `فهرست کاربران نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "فهرست کاربران نمایش داده نشد. اطلاعات حدسی یا ناقص جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
