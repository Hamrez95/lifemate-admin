import Link from "next/link";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./idea-engine.module.css";

export default async function IdeaEnginePage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Idea Engine"
        subtitle="ایده، اسکریپت و Shoot Plan؛ همیشه review-only و وابسته به قرارداد canonical"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Creative planning · Not instrumented</p>
              <h2>ایده‌پردازی را می‌توانیم امن طراحی کنیم؛ هنوز نمی‌توانیم آن را واقعی ذخیره کنیم.</h2>
              <p>
                تا وقتی API canonical برای ایده، revision، review و shoot plan آماده نشود، هیچ
                ایده، score یا script نمایشی ساخته نمی‌شود و دکمهٔ Publish هم وجود ندارد.
              </p>
            </div>
            <Link className={styles.backLink} href="/marketing/content-studio">
              بازگشت به AI Content Studio
            </Link>
          </header>

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : (
            <AdminPageState
              state="unavailable"
              title="Idea Engine هنوز instrument نشده است"
              description="برای فعال شدن این workspace، API ایده و نسخه‌بندیِ review-only باید در سرور فراهم شود. درخواست قرارداد: #378."
            />
          )}

          <section className={styles.boundary} aria-label="مرزهای ایمنی Idea Engine">
            <strong>مرزهای غیرقابل‌مذاکره</strong>
            <ul>
              <li>دادهٔ خام سلامت، تشخیص، درمان و اورژانس ورودی ایده نیست.</li>
              <li>امتیاز heuristic پیش‌بینی viral شدن نیست و تصمیم نهایی با اپراتور می‌ماند.</li>
              <li>Script و Shoot Plan فقط Draft قابل بازبینی هستند؛ انتشار خودکار صفر است.</li>
            </ul>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
