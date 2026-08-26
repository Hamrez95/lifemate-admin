import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getFinanceScenarios } from "@/src/lib/admin-api/finance-scenarios";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../finance.module.css";
import { ScenarioForm } from "./ScenarioForm";

type FinanceScenarioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export default async function FinanceScenarioPage({ searchParams }: FinanceScenarioPageProps) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("finance.read")) redirect("/forbidden");

  const result = await getFinanceScenarios();
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const params = await searchParams;
  const selectedId = single(params.scenario);
  const selected =
    result.kind === "ok" && selectedId
      ? (result.data.items.find((item) => item.scenarioId === selectedId) ?? null)
      : null;
  const canWrite = admin.permissions.includes("finance.scenario.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="finance"
        title="مالی"
        subtitle="Scenario planning canonical، نسخه‌دار و بدون FX ضمنی"
      >
        <div className={styles.page}>
          <section
            className={`${styles.hero} ${styles.financeHero}`}
            aria-labelledby="scenario-title"
          >
            <div className={styles.heroCopy}>
              <p className="eyebrow">ADM-FIN-003 · Scenario planning</p>
              <h2 id="scenario-title">سناریوهای مالی</h2>
              <p>
                BASE، UPSIDE و DOWNSIDE فقط از قرارداد Core خوانده و نسخه‌بندی می‌شوند. Actual از
                read modelهای canonical جدا می‌ماند و فرض‌های سناریو فقط BUDGET یا FORECAST هستند.
              </p>
              <nav className={styles.heroActions} aria-label="ناوبری مالی">
                <Link href="/finance">نمای کلی</Link>
                <Link href="/finance/budget">Budget vs Actual</Link>
                <Link href="/finance/scenario">سناریوی جدید</Link>
              </nav>
            </div>
            <div className={styles.heroArtwork} aria-hidden="true" />
          </section>

          {result.kind === "unavailable" ? (
            <section className={styles.stateBanner} role="status" aria-live="polite">
              <span className={styles.stateIcon} aria-hidden="true">
                !
              </span>
              <div>
                <strong>Scenario API · Unavailable</strong>
                <p>
                  فرم و مقایسه fail-closed هستند و هیچ forecast جایگزین در browser ساخته نمی‌شود.
                  {result.correlationId ? ` کد پیگیری: ${result.correlationId}` : ""}
                </p>
              </div>
            </section>
          ) : null}

          {result.kind === "ok" ? (
            <>
              <section className={styles.scenarioGrid} aria-label="مقایسه سناریوهای canonical">
                {result.data.items.length === 0 ? (
                  <article className={styles.scenarioCard}>
                    <span className={styles.badge}>EMPTY</span>
                    <h3>سناریویی ثبت نشده است</h3>
                    <p>هیچ baseline یا forecast از Actual استنباط نمی‌شود.</p>
                  </article>
                ) : (
                  result.data.items.map((item) => (
                    <article key={item.scenarioId} className={styles.scenarioCard}>
                      <span className={styles.badge}>{item.scenarioKind}</span>
                      <h3>{item.name}</h3>
                      <strong>
                        {item.currency} · v{item.version}
                      </strong>
                      <p>
                        {item.validFrom} تا {item.validTo} · {item.assumptions.length} فرض canonical
                      </p>
                      <p>
                        {item.assumptions
                          .slice(0, 3)
                          .map(
                            (assumption) =>
                              `${assumption.code}: ${assumption.amountMinor} minor (${assumption.classification})`,
                          )
                          .join(" · ")}
                      </p>
                      <Link href={`/finance/scenario?scenario=${encodeURIComponent(item.scenarioId)}`}>
                        ویرایش نسخه
                      </Link>
                    </article>
                  ))
                )}
              </section>

              <section className={styles.panel} aria-labelledby="scenario-form-title">
                <header className={styles.panelHeader}>
                  <div>
                    <p className="eyebrow">Canonical write boundary</p>
                    <h3 id="scenario-form-title">
                      {selected ? `ویرایش ${selected.name}` : "ایجاد سناریوی جدید"}
                    </h3>
                  </div>
                  <span className={styles.badge}>
                    {canWrite ? "finance.scenario.write" : "Read-only"}
                  </span>
                </header>
                <ScenarioForm scenario={selected} canWrite={canWrite} />
              </section>

              <section className={styles.stateBanner} aria-label="معنای داده سناریو">
                <span className={styles.stateIcon} aria-hidden="true">
                  i
                </span>
                <div>
                  <strong>Financial semantics are explicit</strong>
                  <p>
                    amountMinor عدد صحیح است؛ Currency هر سناریو صریح و برای نسخه موجود immutable
                    است؛ `implicitFx=false`. این صفحه Actual را با Budget یا Forecast ادغام نمی‌کند.
                  </p>
                </div>
              </section>
            </>
          ) : null}

          <section className={styles.exportUnavailable} aria-label="وضعیت خروجی سناریو">
            <strong>Export · Unavailable</strong>
            <p>تا وقتی contract canonical export وجود نداشته باشد فایل client-side تولید نمی‌شود.</p>
          </section>
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
