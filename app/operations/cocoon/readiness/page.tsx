import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../../../ops-settings.module.css";

const readinessAreas = [
  {
    id: "ADMIN-F0",
    title: "Staging و migration baseline",
    description: "هم‌ترازی staging با migrationهای canonical LifeMate، بدون کپی PHI.",
    dependency: "#261",
  },
  {
    id: "COMMERCE",
    title: "Commerce و entitlement",
    description: "نمایش commercial-only برای Cocoon و Period conversion، بدون استنتاج وضعیت سلامت.",
    dependency: "#226",
  },
  {
    id: "ADMIN-F1",
    title: "Operations و support diagnostics",
    description: "Bootstrap، نسخه، خطا و correlation metadata از read model privacy-safe.",
    dependency: "#262 · Core #807",
  },
  {
    id: "ADMIN-F2",
    title: "Clinical content governance",
    description: "Review، publish و rollback نسخه‌های محتوای governed با synthetic fixture.",
    dependency: "#263 · Core #786/#819",
  },
] as const;

const forbiddenSignals = [
  "LMP، EDD، gestational age و pregnancy outcome",
  "symptom، mood، note، measurement و medication detail",
  "child growth، vaccine، milestone و document content",
  "service-role، token یا credential در browser و screenshot",
] as const;

export default async function CocoonReadinessPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("operations.read")) redirect("/forbidden");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="operations"
        title="CocoonMate Readiness Gate"
        subtitle="مدرک‌محور، privacy-safe و جدا از Pregnancy Beta mobile gate"
      >
        <main className={styles.page}>
          <section className={styles.hero} aria-labelledby="cocoon-readiness-title">
            <p className="eyebrow">COCOON · ADMIN-GATE · #264</p>
            <h2 id="cocoon-readiness-title">آمادگی Command Center برای CocoonMate</h2>
            <p>
              این gate بررسی می‌کند Command Center بتواند Cocoon را به‌عنوان محصول operate کند، بدون
              اینکه به پنل مشاهده‌ی raw reproductive یا child health تبدیل شود. این gate جای Gateهای
              موبایل Cocoon را نمی‌گیرد.
            </p>
            <div className={styles.actions}>
              <Link href="/operations/cocoon">Cocoon Operations</Link>
              <Link href="/operations/cocoon/content">Clinical governance</Link>
              <Link href="/commerce">Commerce canonical</Link>
            </div>
          </section>

          <section className={styles.banner} role="status" aria-live="polite">
            <span className={styles.bannerIcon} aria-hidden="true">
              i
            </span>
            <div>
              <strong>Gate هنوز قابل‌بستن نیست.</strong>
              <p>
                staging baseline، Admin API read model، clinical content contract و evidence واقعی
                هنوز به‌صورت کامل در این محیط ارائه نشده‌اند؛ وضعیت optimistic یا سبز جعلی نمایش
                داده نمی‌شود.
              </p>
            </div>
          </section>

          <section className={styles.grid2} aria-label="مناطق gate آمادگی Cocoon">
            {readinessAreas.map((area) => (
              <article key={area.id} className={styles.card}>
                <header className={styles.cardHeader}>
                  <div>
                    <p className="eyebrow">{area.id}</p>
                    <h3>{area.title}</h3>
                  </div>
                  <span className={styles.badge}>Needs evidence</span>
                </header>
                <p>{area.description}</p>
                <p className={styles.helper}>وابستگی: {area.dependency}</p>
              </article>
            ))}
          </section>

          <section className={styles.panel} aria-labelledby="cocoon-readiness-privacy-title">
            <header className={styles.panelHeader}>
              <div>
                <p className="eyebrow">Negative privacy assertions</p>
                <h3 id="cocoon-readiness-privacy-title">مواردی که gate باید رد کند</h3>
              </div>
              <span className={styles.badge}>Fail closed</span>
            </header>
            <ul className={styles.list}>
              {forbiddenSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </section>

          <AdminPageState
            state="unavailable"
            title="Evidence bundle هنوز موجود نیست"
            description="برای بستن #264 باید synthetic QA، RBAC/AAL2 negative tests، Commerce regression و payload/log privacy review روی staging واقعی ثبت شود."
          />
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
