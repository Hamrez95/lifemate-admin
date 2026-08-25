import Image from "next/image";
import type { ReactNode } from "react";

import { StateCard } from "./StateCard";

type EmptyStateProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function EmptyState({ title, description, actions }: EmptyStateProps) {
  return (
    <StateCard
      icon={
        <Image
          src="/design-assets/empty-success-sprout-v1.png"
          alt=""
          width={44}
          height={44}
          sizes="44px"
        />
      }
      title={title}
      description={description}
      actions={actions}
      role="status"
    />
  );
}
