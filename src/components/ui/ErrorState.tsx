import type { ReactNode } from "react";

import { StateCard } from "./StateCard";

type ErrorStateProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
};

export function ErrorState({
  title = "این بخش موقتاً در دسترس نیست.",
  description = "برای حفظ امنیت، در صورت خطای Auth یا Admin API به داده مستقیم دیتابیس fallback نمی‌کنیم.",
  actions,
}: ErrorStateProps) {
  return (
    <StateCard icon="!" title={title} description={description} actions={actions} role="alert" />
  );
}
