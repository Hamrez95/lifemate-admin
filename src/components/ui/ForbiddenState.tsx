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
      description="عضویت فعال، سطح دسترسی لازم و مجوز این بخش باید سمت سرور تأیید شود."
      actions={actions}
      role="status"
    />
  );
}
