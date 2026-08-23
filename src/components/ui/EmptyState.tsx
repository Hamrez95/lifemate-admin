import type { ReactNode } from "react";

import { StateCard } from "./StateCard";

type EmptyStateProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function EmptyState({ title, description, actions }: EmptyStateProps) {
  return <StateCard icon="◇" title={title} description={description} actions={actions} role="status" />;
}
