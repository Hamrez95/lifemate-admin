import Link from "next/link";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./creative-radar.module.css";

export default async function CreativeRadarPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Creative Radar"
        subtitle="رصد referenceهای عمومی، با provenance روشن و بدون بازتولید یا انتشار"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Creative intelligence · Unavailable</p>
              <h2>
                مرجع‌های عمومی را می‌توانیم ایمن ارزیابی کنیم؛ هنوز نمی‌توانیم آن‌ها را واقعی ثبت
                کنیم.
              </h2>
              <p>
                تا زمان آماده‌شدن API canonical برای capture، provenance، تحلیل و review، هیچ
                reference، trend، score یا توصیهٔ ساختگی نمایش داده نمی‌شود.
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
              title="Creative Radar هنوز به منبع canonical متصل نیست"
              description="ثبت منبع عمومی، provenance، وضعیت review و خروجی analysis به قرارداد server-side نیاز دارد. درخواست قرارداد: #380."
            />
          )}

          <section className={styles.boundary} aria-label="مرزهای ایمنی Creative Radar">
            <strong>مرزهای ایمنی این workspace</strong>
            <ul>
              <li>
                فقط reference عمومی با provenance روشن؛ محتوای خصوصی یا دادهٔ سلامت وارد نمی‌شود.
              </li>
              <li>
                Reference برای الهام است، نه بازتولید creative، جعل مالکیت یا پیش‌بینی viral شدن.
              </li>
              <li>
                هیچ asset یا analysisی publish-ready نیست؛ اپراتور تنها پس از review تصمیم می‌گیرد.
              </li>
            </ul>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
