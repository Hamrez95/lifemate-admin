import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../../../ops-settings.module.css";

const lifecycle = [
  ["Draft", "ایجاد یا ویرایش نسخه‌ی جدید، بدون اثر روی کلاینت"],
  ["In review", "بازبینی محتوایی و فنی با actor و comment قابل‌ردیابی"],
  ["Approved", "تأیید نسخه‌ی مشخص و immutable برای انتشار"],
  ["Published", "فعال‌سازی explicit با version و effective date"],
  ["Retired / Rollback", "خارج کردن نسخه یا بازگشت به آخرین نسخه‌ی approved"],
] as const;

const capabilities = [
  "content.view",
  "content.draft",
  "content.review",
  "content.publish",
  "content.rollback",
  "safety_rule.review",
  "safety_rule.publish",
] as const;

export default async function CocoonClinicalContentPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("operations.read")) redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="operations"
        title="Cocoon Clinical Content"
        subtitle="Governance برای محتوای آموزشی و ruleهای deterministic، بدون WYSIWYG آزاد"
      >
        <main className={styles.page}>
          <section className={styles.hero} aria-labelledby="cocoon-content-title">
            <p className="eyebrow">COCOON · ADMIN-F2 · GOVERNED CONTENT</p>
            <h2 id="cocoon-content-title">Clinical content governance</h2>
            <p>
              محتوای بارداری و ruleهای safety مثل marketing copy معمولی نیستند. انتشار باید
              versioned، قابل‌بررسی، برگشت‌پذیر و مستقل از اطلاعات کاربر واقعی باشد.
            </p>
            <div className={styles.actions}>
              <Link href="/operations/cocoon">بازگشت به Cocoon Operations</Link>
              <Link href="/security/audit">مشاهده Audit</Link>
            </div>
          </section>

          <section className={styles.banner} role="status" aria-live="polite">
            <span className={styles.bannerIcon} aria-hidden="true">
              i
            </span>
            <div>
              <strong>قرارداد محتوای Core هنوز برای Admin API در دسترس نیست.</strong>
              <p>
                بنابراین این صفحه فقط workflow و مرزهای governance را نشان می‌دهد؛ هیچ edit،
                publish، rollback یا rule اجرایی از مرورگر قابل‌فراخوانی نیست.
              </p>
            </div>
          </section>

          <section className={styles.grid2} aria-label="چرخه‌ی governance">
            {lifecycle.map(([name, description]) => (
              <article key={name} className={styles.card}>
                <header className={styles.cardHeader}>
                  <h3>{name}</h3>
                  <span className={styles.badge}>Contract pending</span>
                </header>
                <p>{description}</p>
              </article>
            ))}
          </section>

          <section className={styles.grid2}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Synthetic preview</p>
                  <h3>Preview امن و بدون Person واقعی</h3>
                </div>
                <span className={styles.badge}>Unavailable</span>
              </header>
              <p>
                Preview باید بر اساس locale، direction، stage و synthetic fixture انجام شود؛ انتخاب
                کاربر واقعی یا Pregnancy واقعی مجاز نیست.
              </p>
              <div className={styles.actions}>
                <button type="button" disabled>
                  باز کردن Preview
                </button>
              </div>
            </article>

            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div>
                  <p className="eyebrow">Required capabilities</p>
                  <h3>قابلیت‌های پیشنهادی</h3>
                </div>
                <span className={styles.badge}>Not granted here</span>
              </header>
              <ul className={styles.list}>
                {capabilities.map((capability) => (
                  <li key={capability} className={styles.codeSafe}>
                    {capability}
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <AdminPageState
            state="unavailable"
            title="Publish و rollback فعال نیستند"
            description="ابتدا Core #786/#819، قرارداد versioned content، fixture validation، capability اختصاصی و audit mutation باید در Admin API ارائه شود."
          />
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
