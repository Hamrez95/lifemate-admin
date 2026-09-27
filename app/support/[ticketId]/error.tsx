"use client";

import { ErrorState } from "@/src/components/ui";

type SupportTicketErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SupportTicketError({ error, reset }: SupportTicketErrorProps) {
  return (
    <ErrorState
      title="جزئیات تیکت بارگذاری نشد"
      description={
        error.digest
          ? `جزئیات تیکت نمایش داده نشد. شناسه رخداد: ${error.digest}`
          : "جزئیات تیکت نمایش داده نشد. هیچ پیام یا اطلاعات مشتری حدسی جایگزین نمی‌شود."
      }
      actions={
        <button type="button" onClick={reset}>
          تلاش دوباره
        </button>
      }
    />
  );
}
