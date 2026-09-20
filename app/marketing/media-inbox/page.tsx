import Link from "next/link";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./media-inbox.module.css";

export default async function MediaInboxPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Media Inbox"
        subtitle="دارایی خام خصوصی، lineage شفاف و پردازشِ server-authoritative"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Production pipeline · Unavailable</p>
              <h2>تا منبع خصوصی و job واقعی نداریم، upload یا وضعیت پردازش نمایشی نداریم.</h2>
              <p>
                Media Inbox فقط با signed upload، policy سرور و processing job قابل اتکا است. این
                صفحه هیچ فایل، thumbnail، transcript، progress یا نتیجهٔ ساختگی نشان نمی‌دهد.
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
              title="Media Inbox به قرارداد storage و job متصل نیست"
              description="برای نمایش دارایی و عملیات امن، API canonical شامل signed upload، lineage، release state و processing jobs لازم است. درخواست قرارداد: #383."
            />
          )}

          <section className={styles.boundary} aria-label="مرزهای ایمنی Media Inbox">
            <strong>مرزهای غیرقابل‌مذاکره</strong>
            <ul>
              <li>
                فایل خام خصوصی می‌ماند و فقط با کلید opaque و دسترسی server-side قابل دریافت است.
              </li>
              <li>
                هر derivative باید به raw asset، job و وضعیت review خود وصل بماند؛ raw asset
                تغییرناپذیر است.
              </li>
              <li>دارایی restricted یا بدون release معتبر هرگز وارد صف publish نمی‌شود.</li>
            </ul>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
