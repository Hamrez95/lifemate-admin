import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./commerce-reference.module.css";

export type CommerceWorkspaceTab =
  "plans" | "promotions" | "subscriptions" | "revenue" | "adjustments";

type CommerceWorkspaceHeaderProps = {
  active: CommerceWorkspaceTab;
  eyebrow: string;
  title: string;
  description: string;
  badges?: readonly string[];
};

const tabs: readonly { key: CommerceWorkspaceTab; href: string; label: string }[] = [
  { key: "plans", href: "/commerce/plans", label: "پلن‌ها" },
  { key: "promotions", href: "/commerce/promotions", label: "پروموشن‌ها" },
  { key: "subscriptions", href: "/commerce/subscriptions", label: "اشتراک‌ها" },
  { key: "adjustments", href: "/commerce/entitlements/adjustments", label: "Adjustment" },
  { key: "revenue", href: "/commerce/revenue", label: "درآمد" },
];

export function CommerceWorkspaceHeader({
  active,
  eyebrow,
  title,
  description,
  badges = ["Core canonical", "AAL2", "RBAC", "Audit"],
}: CommerceWorkspaceHeaderProps) {
  return (
    <>
      <section className={styles.hero} aria-labelledby={`commerce-${active}-title`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h2 id={`commerce-${active}-title`}>{title}</h2>
          <p>{description}</p>
          <div className={styles.badges} aria-label="مرزهای ایمنی تجارت">
            {badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <Image
            src="/design-assets/commerce-hero-v1.png"
            alt=""
            width={1536}
            height={1024}
            sizes="(max-width: 720px) 60vw, (max-width: 1100px) 34vw, 360px"
            priority
          />
        </div>
      </section>
      <nav className={styles.tabs} aria-label="بخش‌های Commerce">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={styles.tab}
            aria-current={active === tab.key ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function CoreDependencyNotice({
  title,
  children,
  tone = "blocked",
}: {
  title: string;
  children: ReactNode;
  tone?: "blocked" | "available" | "info";
}) {
  return (
    <article className={styles.dependency} data-tone={tone}>
      <div className={styles.dependencyIcon} aria-hidden="true">
        {tone === "available" ? "✓" : tone === "info" ? "i" : "!"}
      </div>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </article>
  );
}

export function CommerceDependencyGrid({ children }: { children: ReactNode }) {
  return (
    <section className={styles.dependencyGrid} aria-label="وضعیت قراردادهای Core">
      {children}
    </section>
  );
}
