import Link from "next/link";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./review-publish.module.css";

export default async function ReviewPublishPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Review & Publish"
        subtitle="تصمیم انسانی روی revision دقیق؛ انتشار فقط با provider تأییدشده"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Review queue · Unavailable</p>
              <h2>
                تا queue و provider canonical نداریم، هیچ آیتمی را آمادهٔ انتشار نشان نمی‌دهیم.
              </h2>
              <p>
                review، schedule، publish و manual reconciliation باید بر اساس revision دقیق، asset
                lineage و قابلیت provider سرور باشند. خروجی نمایشی، approval یا Published ساختگی در
                این سطح وجود ندارد.
              </p>
            </div>
            <Link className={styles.backLink} href="/marketing/content-calendar">
              بازگشت به Content Calendar
            </Link>
          </header>

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : (
            <AdminPageState
              state="unavailable"
              title="Review & Publish به queue canonical متصل نیست"
              description="برای صف واحد، approval revision، provider readiness، execution و reconciliation، قرارداد server-side لازم است. درخواست قرارداد: #389."
            />
          )}

          <section className={styles.boundary} aria-label="مرزهای ایمنی Review and Publish">
            <strong>guardهای غیرقابل‌دورزدن</strong>
            <ul>
              <li>
                هر تغییر material approval را باطل می‌کند؛ تأیید source به مشتق‌ها ارث نمی‌رسد.
              </li>
              <li>
                Provider غیرتأییدشده، stale یا unsupported فقط fallback عملی نشان می‌دهد، نه
                publish.
              </li>
              <li>
                OutcomeUnknown نیازمند reconciliation است؛ retry کور یا انتشار دوباره مجاز نیست.
              </li>
            </ul>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
