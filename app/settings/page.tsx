import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../ops-settings.module.css";

const categories = [
  "سازمان",
  "کاربران و نقش‌ها",
  "احراز هویت",
  "اعلان‌ها",
  "داده و تحلیل",
  "یکپارچه‌سازی‌ها",
  "محیط‌ها",
] as const;

const integrations = ["پرداخت", "شبکه اجتماعی", "پیامک", "Push notifications", "دستگاه‌های پوشیدنی"] as const;

export default async function SettingsPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("settings.read")) redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="settings"
        title="تنظیمات"
        subtitle="تنظیمات Command Center با default-deny و بدون نمایش credential"
      >
        <div className={styles.page}>
          <section className={styles.hero} aria-labelledby="settings-title">
            <p className="eyebrow">ADM-SET · Reference 27</p>
            <h2 id="settings-title">تنظیمات مرکز فرماندهی</h2>
            <p>
              دسته‌بندی صفحه مطابق مرجع طراحی است، اما مقدار قابل‌ویرایش فقط زمانی فعال می‌شود که
              Core/Admin API قرارداد معتبر read/write، permission، validation، reason، idempotency و
              audit داشته باشد.
            </p>
            <div className={styles.settingsNav} aria-label="دسته‌بندی تنظیمات">
              {categories.map((category) => <span key={category}>{category}</span>)}
            </div>
          </section>

          <section className={styles.banner} role="status" aria-live="polite">
            <span className={styles.bannerIcon} aria-hidden="true">i</span>
            <div>
              <strong>Settings write contract در این پنل در دسترس نیست.</strong>
              <p>
                بنابراین فرم ذخیره فعال نشده است. هیچ secret، API key، token، connection string یا
                credential در HTML، client props یا کنترل‌های فرم نمایش داده نمی‌شود.
              </p>
            </div>
          </section>

          <section className={styles.grid2}>
            <article className={styles.panel} aria-labelledby="organization-settings-title">
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Organization</p>
                  <h3 id="organization-settings-title">تعریف سازمان و قالب نمایش</h3>
                </div>
                <span className={styles.badge}>Read-only</span>
              </header>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="organization-name">نام سازمان</label>
                  <input id="organization-name" value="LifeMate" readOnly aria-readonly="true" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="default-locale">زبان پیش‌فرض</label>
                  <select id="default-locale" value="fa-IR" disabled>
                    <option value="fa-IR">فارسی</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="default-timezone">منطقه زمانی</label>
                  <input id="default-timezone" value="Asia/Tehran" readOnly aria-readonly="true" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="default-calendar">تقویم</label>
                  <input id="default-calendar" value="در انتظار قرارداد canonical" readOnly aria-readonly="true" />
                </div>
              </div>
              <p className={styles.helper}>مقادیر ثابت UI فقط برای identity/locale غیرحساس نمایش داده شده‌اند؛ وضعیت backend از آن‌ها استنباط نمی‌شود.</p>
            </article>

            <article className={styles.panel} aria-labelledby="data-settings-title">
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Data freshness</p>
                  <h3 id="data-settings-title">تعاریف داده و تازگی</h3>
                </div>
                <span className={styles.badge}>Unavailable</span>
              </header>
              <ul className={styles.list}>
                <li><strong>Dashboard freshness</strong><p>تا زمان وجود settings read model نمایش یا ویرایش نمی‌شود.</p></li>
                <li><strong>Operational freshness</strong><p>مقدار پیش‌فرض یا interval ساختگی ساخته نشده است.</p></li>
                <li><strong>Analytics freshness</strong><p>هر workspace از freshness canonical خودش استفاده می‌کند.</p></li>
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
                  <p>وضعیت اتصال و تنظیمات فقط از contract معتبر نمایش داده می‌شود؛ secret یا token هرگز به کلاینت ارسال نمی‌شود.</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="sensitive-settings-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Sensitive changes</p>
                <h3 id="sensitive-settings-title">تغییرات حساس</h3>
              </div>
              <span className={styles.badge}>Fail-closed</span>
            </header>
            <div className={styles.confirmation}>
              <strong>Confirmation الزامی است</strong>
              <p>
                هر تغییر حساس آینده باید قبل از mutation، permission مناسب، AAL2 در صورت نیاز، reason
                روشن، confirmation صریح، idempotency و audit داشته باشد. تا قبل از وجود آن قرارداد،
                کنترل اجرایی فعال نمی‌شود.
              </p>
            </div>
            <div className={styles.saveState} aria-live="polite">
              <button type="button" disabled>ذخیره تغییرات — در دسترس نیست</button>
              <span>Save state: unavailable · هیچ درخواست write ارسال نشده است.</span>
            </div>
          </section>

          <section className={styles.banner} role="alert">
            <span className={styles.bannerIcon} aria-hidden="true">!</span>
            <div>
              <strong>خطاها باید قابل‌فهم و بدون افشای اطلاعات حساس باشند.</strong>
              <p>
                در صورت اضافه‌شدن endpoint واقعی، خطای شبکه یا validation باید پیام کوتاه کاربرپسند و
                correlation id امن داشته باشد؛ stack trace، secret و credential نباید نمایش داده شود.
              </p>
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
