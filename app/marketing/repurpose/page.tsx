import Link from "next/link";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./repurpose.module.css";

export default async function RepurposePage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Repurpose Engine"
        subtitle="یک creative، مشتق‌های channel-specific و review جداگانه"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Channel derivatives · Unavailable</p>
              <h2>بدون source و derivative canonical، نسخهٔ Instagram یا LinkedIn جعل نمی‌کنیم.</h2>
              <p>
                هر مشتق باید source، revision، claim، link و وضعیت review خودش را داشته باشد. تا
                زمانی که قرارداد server-side آماده نیست، هیچ caption، UTM، export یا Published
                ساختگی نمایش داده نمی‌شود.
              </p>
            </div>
            <Link className={styles.backLink} href="/marketing">
              بازگشت به Marketing
            </Link>
          </header>

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : (
            <AdminPageState
              state="unavailable"
              title="Repurpose Engine به قرارداد derivative متصل نیست"
              description="منبع، قابلیت destination، revision-specific review، manual export و generation job باید از API canonical بازگردند. درخواست قرارداد: #387."
            />
          )}

          <section className={styles.boundary} aria-label="مرزهای ایمنی Repurpose Engine">
            <strong>مرزهای ایمنی مشتق‌سازی</strong>
            <ul>
              <li>تأیید source به‌تنهایی تأیید مشتق یا claim تازه نیست؛ هر revision نیازمند review است.</li>
              <li>قابلیت native پلتفرمِ پشتیبانی‌نشده فقط Manual publish required است، نه Published.</li>
              <li>ویرایش هر مشتق نباید source یا مشتق‌های دیگر را تغییر دهد.</li>
            </ul>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
