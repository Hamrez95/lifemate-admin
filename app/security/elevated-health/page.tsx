import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getElevatedHealth,
  type ElevatedHealthCapability,
} from "@/src/lib/admin-api/elevated-health";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./elevated-health.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function ElevatedHealthPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("security.break_glass.request")) redirect("/forbidden");

  const requested = await searchParams;
  const subjectPersonId = single(requested.subjectPersonId);
  const rawCapability = single(requested.capability);
  const selectedCapability: ElevatedHealthCapability =
    rawCapability === "women_health.read.elevated"
      ? "women_health.read.elevated"
      : "health.read.elevated";
  const shouldRead = Boolean(subjectPersonId && rawCapability);
  const result = shouldRead
    ? await getElevatedHealth({ subjectPersonId, capability: selectedCapability, limit: 50 })
    : null;

  if (result?.kind === "unauthenticated") redirect("/login");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="security"
        title="Elevated Health Viewer"
        subtitle="Read-only · exact target · active Break-glass required on every read"
      >
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <p className="eyebrow">ADM-USR-005 · Sensitive · No export</p>
              <h2>نمای محدود داده سلامت</h2>
              <p>
                این صفحه هیچ دسترسی مستقلی ایجاد نمی‌کند. Core در هر درخواست exact Person و Capability
                را با Break-glass فعال دوباره بررسی می‌کند؛ expiry یا revoke در درخواست بعدی فوراً اثر می‌گذارد.
              </p>
            </div>
            <Link href="/security/break-glass">مدیریت Break-glass</Link>
          </section>

          <form className={styles.filters} method="get" action="/security/elevated-health">
            <label>
              <span>Person ID دقیق</span>
              <input name="subjectPersonId" defaultValue={subjectPersonId} required autoComplete="off" />
            </label>
            <label>
              <span>Capability دقیق</span>
              <select name="capability" defaultValue={selectedCapability}>
                <option value="health.read.elevated">health.read.elevated</option>
                <option value="women_health.read.elevated">women_health.read.elevated</option>
              </select>
            </label>
            <button type="submit">خواندن با Grant فعال</button>
          </form>

          {!shouldRead ? (
            <AdminPageState
              state="empty"
              title="Person و Capability را انتخاب کنید"
              description="بدون Break-glass Approved و منقضی‌نشده، Core پاسخ را fail-closed رد می‌کند."
            />
          ) : result?.kind === "forbidden" ? (
            <AdminPageState
              state="forbidden"
              title="Grant فعال برای این target/scope وجود ندارد"
              description="Founder role، Relationship یا حضور در این صفحه جایگزین Break-glass نیست."
            />
          ) : result?.kind === "invalid" ? (
            <AdminPageState state="error" title="درخواست معتبر نیست" description={result.message} />
          ) : result?.kind === "unavailable" ? (
            <AdminPageState state="unavailable" title="Elevated Health API در دسترس نیست" />
          ) : result?.kind === "ok" && result.data.capability === "health.read.elevated" ? (
            <div className={styles.sections}>
              <section className={styles.panel}>
                <h3>Health observations</h3>
                {(result.data.observations ?? []).length === 0 ? (
                  <AdminPageState state="empty" title="Observation ثبت نشده است" />
                ) : (
                  <div className={styles.list}>
                    {(result.data.observations ?? []).map((item, index) => (
                      <article key={`${item.observedAtUtc}-${item.observationType}-${index}`}>
                        <strong>{item.observationType}</strong>
                        <span>
                          {item.valuePrimary ?? "—"} {item.unitPrimary ?? ""}
                          {item.valueSecondary !== null ? ` / ${item.valueSecondary} ${item.unitSecondary ?? ""}` : ""}
                        </span>
                        <small>{formatDate(item.observedAtUtc)} · {item.sourceCategory ?? "—"}</small>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className={styles.panel}>
                <h3>Medications</h3>
                <div className={styles.list}>
                  {(result.data.medications ?? []).map((item, index) => (
                    <article key={`${item.name}-${item.updatedAtUtc}-${index}`}>
                      <strong>{item.name}</strong>
                      <span>{item.strengthText ?? "—"} · {item.form ?? "—"}</span>
                      <small>{formatDate(item.updatedAtUtc)}</small>
                    </article>
                  ))}
                </div>
              </section>
              <section className={styles.panel}>
                <h3>Treatment plans</h3>
                <div className={styles.list}>
                  {(result.data.treatmentPlans ?? []).map((item, index) => (
                    <article key={`${item.updatedAtUtc}-${index}`}>
                      <strong>{item.status}</strong>
                      <span>{item.doseText}</span>
                      <small>{item.startDate} → {item.endDate ?? "—"}</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : result?.kind === "ok" ? (
            <section className={styles.panel}>
              <h3>Women Health episodes</h3>
              <p className={styles.notice}>Private notes و free-text در این projection عمداً برگردانده نمی‌شوند.</p>
              {(result.data.episodes ?? []).length === 0 ? (
                <AdminPageState state="empty" title="Episode ثبت نشده است" />
              ) : (
                <div className={styles.list}>
                  {(result.data.episodes ?? []).map((item, index) => (
                    <article key={`${item.startedOn}-${index}`}>
                      <strong>{item.startedOn}</strong>
                      <span>تا {item.endedOn ?? "—"}</span>
                      <small>به‌روزرسانی {formatDate(item.updatedAtUtc)}</small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
