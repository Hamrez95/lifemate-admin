import type { ReactNode } from "react";

import { StateCard } from "./StateCard";

type ForbiddenStateProps = {
  actions?: ReactNode;
};

export function ForbiddenState({ actions }: ForbiddenStateProps) {
  return (
    <StateCard
      icon="403"
      title="برای این بخش دسترسی ندارید."
      description="دسترسی فقط با عضویت فعال، permission لازم و کنترل‌های امنیتی سمت سرور برقرار می‌شود. دیده‌شدن منو یا ورود موفق به‌تنهایی مجوز ایجاد نمی‌کند."
      actions={actions}
      role="status"
    />
  );
}
