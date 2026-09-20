import Link from "next/link";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./creative-renderer.module.css";

export default async function CreativeRendererPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Creative Renderer"
        subtitle="قالب‌های نسخه‌دار، ورودی ساختاریافته و خروجی قابل‌ردیابی"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Brand production · Unavailable</p>
              <h2>بدون Template و Render Job canonical، preview یا asset تولیدشده جعل نمی‌کنیم.</h2>
              <p>
                خروجی قابل انتشار فقط وقتی ساخته می‌شود که نسخهٔ Brand Kit، slotهای مجاز، asset
                lineage و وضعیت review از سرور برگردند؛ این UI هرگز graphic نمایشی نمی‌سازد.
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
              title="Creative Renderer به قرارداد template و render متصل نیست"
              description="Catalog نسخه‌دار، schema slotها، render job و output lineage باید canonical و server-authoritative باشند. درخواست قرارداد: #385."
            />
          )}

          <section className={styles.boundary} aria-label="مرزهای ایمنی Creative Renderer">
            <strong>مرزهای ایمنی renderer</strong>
            <ul>
              <li>
                Template فقط ورودی ساختاریافتهٔ allow-listed می‌پذیرد؛ HTML، CSS و JavaScript آزاد
                ندارد.
              </li>
              <li>
                source asset، font یا متن نامعتبر باید render را متوقف کند، نه اینکه خروجی خراب
                بسازد.
              </li>
              <li>
                هر خروجی به template/version و asset lineage وصل می‌ماند و پیش از publish نیازمند
                review است.
              </li>
            </ul>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
