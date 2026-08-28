import Link from "next/link";
import type { ReactNode } from "react";

import { getAccountProductVersions } from "@/src/lib/admin-api/product-release";
import { getUserPrivacySummary } from "@/src/lib/admin-api/privacy-user-summary";
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
  const canReadPrivacy = admin.permissions.includes("privacy.consent.read");

  if (!canReadVersions && !canReadPrivacy) return children;

  const [versionResult, privacyResult] = await Promise.all([
    canReadVersions ? getAccountProductVersions(accountId) : Promise.resolve(null),
    canReadPrivacy ? getUserPrivacySummary(accountId) : Promise.resolve(null),
  ]);
  const versionItems = versionResult?.kind === "ok" ? versionResult.data.items : [];
  const privacy = privacyResult?.kind === "ok" ? privacyResult.data : null;

  return (
    <>
      {children}
      <aside className={styles.panel} aria-label="User 360 operational context">
        {canReadVersions ? (
          <section className={styles.contextSection} aria-label="Product version context">
            <header>
              <div>
                <span>User 360 · Release context</span>
                <strong>نسخه و پلتفرم فعلی</strong>
              </div>
              <Link href="/operations/releases">Release controls →</Link>
            </header>
            {versionResult?.kind === "ok" ? (
              versionItems.length === 0 ? (
                <p>هنوز telemetry نسخه‌ای برای این حساب ثبت نشده است.</p>
              ) : (
                <ul>
                  {versionItems.map((item) => (
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
          </section>
        ) : null}

        {canReadPrivacy ? (
          <section className={styles.contextSection} aria-label="Privacy and consent context">
            <header>
              <div>
                <span>User 360 · Privacy context</span>
                <strong>پذیرش و ترجیحات</strong>
              </div>
              <Link href="/privacy">Privacy controls →</Link>
            </header>
            {privacy ? (
              <div className={styles.privacySummary}>
                <dl>
                  <div>
                    <dt>پذیرش‌های قانونی</dt>
                    <dd>{privacy.legalAcceptances.length.toLocaleString("fa-IR")}</dd>
                  </div>
                  <div>
                    <dt>Preference فعال</dt>
                    <dd>
                      {privacy.preferences.filter((item) => item.enabled).length.toLocaleString("fa-IR")}
                    </dd>
                  </div>
                  <div>
                    <dt>Consent ثبت‌شده</dt>
                    <dd>{privacy.consents.length.toLocaleString("fa-IR")}</dd>
                  </div>
                </dl>
                <small>نمایش فقط خواندنی است؛ Admin نمی‌تواند پذیرش یا Opt-in را به‌جای کاربر ثبت کند.</small>
              </div>
            ) : (
              <p>Privacy summary فعلاً در دسترس نیست؛ داده جایگزین ساخته نمی‌شود.</p>
            )}
          </section>
        ) : null}
      </aside>
    </>
  );
}
