import Link from "next/link";
import type { ReactNode } from "react";

import { getAccountProductVersions } from "@/src/lib/admin-api/product-release";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./product-version-context.module.css";

type Props = {
  children: ReactNode;
  params: Promise<{ accountId: string }>;
};

export default async function User360Layout({ children, params }: Props) {
  const { accountId } = await params;
  const admin = await requireAdminAccess();
  const canReadVersions = admin.permissions.includes("analytics.product_versions.read");

  if (!canReadVersions) return children;

  const result = await getAccountProductVersions(accountId);
  const items = result.kind === "ok" ? result.data.items : [];

  return (
    <>
      {children}
      <aside className={styles.panel} aria-label="Product version context">
        <header>
          <div>
            <span>User 360 · Release context</span>
            <strong>نسخه و پلتفرم فعلی</strong>
          </div>
          <Link href="/operations/releases">Release controls →</Link>
        </header>
        {result.kind === "ok" ? (
          items.length === 0 ? (
            <p>هنوز telemetry نسخه‌ای برای این حساب ثبت نشده است.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={`${item.product}-${item.platform}`}>
                  <b>{item.product}</b>
                  <span>{item.platform}</span>
                  <code>
                    {item.appVersion} · {item.buildNumber}
                  </code>
                  <small>
                    cohort: {item.rolloutCohort ?? "—"} · last seen:{" "}
                    {new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Tehran",
                    }).format(new Date(item.lastSeenAtUtc))}
                  </small>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p>Version telemetry فعلاً در دسترس نیست؛ داده جایگزین ساخته نمی‌شود.</p>
        )}
      </aside>
    </>
  );
}
