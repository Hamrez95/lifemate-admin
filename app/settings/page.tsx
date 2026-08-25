import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getCommandCenterPreferences } from "@/src/lib/admin-api/settings-preferences";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../ops-settings.module.css";
import { SettingsPreferencesForm } from "./SettingsPreferencesForm";

const categories = [
  "سازمان",
  "کاربران و نقش‌ها",
  "احراز هویت",
  "اعلان‌ها",
  "داده و تحلیل",
  "یکپارچه‌سازی‌ها",
  "محیط‌ها",
] as const;

const integrations = [
  "پرداخت",
  "شبکه اجتماعی",
  "پیامک",
  "Push notifications",
  "دستگاه‌های پوشیدنی",
] as const;

export default async function SettingsPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("settings.read")) redirect("/forbidden");

  const result = await getCommandCenterPreferences();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");
  const canWrite = admin.permissions.includes("settings.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="settings"
        title="تنظیمات"
        subtitle="تنظیمات canonical Command Center با default-deny و بدون نمایش credential"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="settings-title">
            <p className="eyebrow">ADM-SET · Reference 27</p>
            <h2 id="settings-title">تنظیمات مرکز فرماندهی</h2>
            <p>
              تنظیمات عمومی قابل‌تغییر فقط از Admin API canonical خوانده و ذخیره می‌شوند. هیچ secret،
              API key، token، credential یا connection string به مرورگر ارسال نمی‌شود.
            </p>
            <div className={styles.settingsNav} aria-label="دسته‌بندی تنظیمات">
              {categories.map((category) => (
                <span key={category}>{category}</span>
              ))}
            </div>
          </section>

          {result.kind === "unavailable" ? (
            <section className={styles.banner} role="status" aria-live="polite">
              <span className={styles.bannerIcon} aria-hidden="true">
                !
              </span>
              <div>
                <strong>Settings API فعلاً در دسترس نیست.</strong>
                <p>
                  فرم fail-closed باقی می‌ماند و مقدار ساختگی نمایش داده نمی‌شود.
                  {result.correlationId ? ` کد پیگیری: ${result.correlationId}` : ""}
                </p>
              </div>
            </section>
          ) : null}

          {result.kind === "ok" ? (
            <section className={styles.panel} aria-labelledby="organization-settings-title">
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Canonical preferences</p>
                  <h3 id="organization-settings-title">تعریف سازمان و قالب نمایش</h3>
                </div>
                <span className={styles.badge}>{canWrite ? "settings.write" : "Read-only"}</span>
              </header>
              <SettingsPreferencesForm
                preferences={result.preferences}
                supportedLocales={result.supportedLocales}
                canWrite={canWrite}
              />
              <p className={styles.helper}>
                آخرین بروزرسانی canonical:{" "}
                {result.preferences.updatedAtUtc
                  ? new Intl.DateTimeFormat("fa-IR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Tehran",
                    }).format(new Date(result.preferences.updatedAtUtc))
                  : "ثبت نشده"}
              </p>
            </section>
          ) : null}

          <section className={styles.grid2}>
            <article className={styles.panel} aria-labelledby="data-settings-title">
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Data freshness</p>
                  <h3 id="data-settings-title">تعاریف داده و تازگی</h3>
                </div>
                <span className={styles.badge}>Workspace-owned</span>
              </header>
              <ul className={styles.list}>
                <li>
                  <strong>Dashboard freshness</strong>
                  <p>از قرارداد canonical همان workspace خوانده می‌شود.</p>
                </li>
                <li>
                  <strong>Operational freshness</strong>
                  <p>مقدار یا interval ساختگی در Settings ایجاد نمی‌شود.</p>
                </li>
                <li>
                  <strong>Analytics freshness</strong>
                  <p>Analytics از freshness canonical خودش استفاده می‌کند.</p>
                </li>
              </ul>
            </article>

            <article className={styles.panel} aria-labelledby="security-settings-title">
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Security boundary</p>
                  <h3 id="security-settings-title">مرز تنظیمات قابل‌ویرایش</h3>
                </div>
                <span className={styles.badge}>Allow-listed</span>
              </header>
              <ul className={styles.list}>
                <li>
                  <strong>قابل تغییر</strong>
                  <p>نام نمایشی، locale و IANA timezone.</p>
                </li>
                <li>
                  <strong>غیرقابل تغییر از این مسیر</strong>
                  <p>Auth، permission، provider config، endpoint و credential.</p>
                </li>
                <li>
                  <strong>Mutation safety</strong>
                  <p>AAL2، settings.write، reason، confirmation، idempotency، version و audit.</p>
                </li>
              </ul>
            </article>
          </section>

          <section className={styles.panel} aria-labelledby="integration-settings-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Integrations</p>
                <h3 id="integration-settings-title">یکپارچه‌سازی‌ها</h3>
              </div>
              <span className={styles.badge}>No credentials exposed</span>
            </header>
            <div className={styles.grid3}>
              {integrations.map((name) => (
                <article key={name} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>{name}</h3>
                    <span className={styles.badge}>Unavailable</span>
                  </div>
                  <p>
                    وضعیت اتصال فقط زمانی نمایش داده می‌شود که contract canonical مخصوص همان provider
                    وجود داشته باشد؛ secret یا token هرگز به client ارسال نمی‌شود.
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.banner} role="alert">
            <span className={styles.bannerIcon} aria-hidden="true">
              i
            </span>
            <div>
              <strong>خطاها privacy-safe باقی می‌مانند.</strong>
              <p>
                validation و conflict پیام کوتاه کاربرپسند می‌دهند؛ خطاهای backend فقط در صورت وجود
                correlation id امن را نمایش می‌دهند و stack trace یا credential افشا نمی‌شود.
              </p>
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
