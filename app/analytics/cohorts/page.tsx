import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  COHORT_SUPPRESSION_THRESHOLD,
  getAnalyticsCohorts,
  type AnalyticsCohortReport,
  type CohortRow,
  type RetentionCell,
} from "@/src/lib/admin-api/analytics-cohorts";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./cohorts.module.css";

type CohortsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const numberFormat = new Intl.NumberFormat("fa-IR");
const percentFormat = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "short",
  timeStyle: "short",
});

const products = [
  { value: "", label: "همه محصولات" },
  { value: "wellmate", label: "WellMate" },
  { value: "caremate", label: "CareMate" },
  { value: "women_health", label: "Women Health" },
] as const;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function filters(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "product"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

function stateLabel(state: string): string {
  switch (state) {
    case "partial":
      return "داده محدود اما واقعی";
    case "suppressed":
      return "حفاظت حریم خصوصی";
    case "ready":
      return "آماده";
    default:
      return "در دسترس نیست";
  }
}

function RetentionValue({ cell }: { cell: RetentionCell }) {
  if (cell.state === "suppressed") {
    return (
      <span className={styles.suppressed} title={cell.reason ?? undefined}>
        کمتر از آستانه
      </span>
    );
  }
  if (cell.state === "unavailable" || cell.rate === null) {
    return (
      <span className={styles.unavailable} title={cell.reason ?? undefined}>
        —
      </span>
    );
  }
  return <span>{percentFormat.format(cell.rate * 100)}٪</span>;
}

function CohortTable({ rows }: { rows: CohortRow[] }) {
  if (rows.length === 0) {
    return (
      <AdminPageState
        state="empty"
        title="Cohort قابل نمایش وجود ندارد"
        description="برای بازه انتخاب‌شده سری acquisition معتبری از منبع canonical دریافت نشده است."
      />
    );
  }

  return (
    <div className={styles.tableScroller} tabIndex={0} aria-label="جدول cohort؛ قابل پیمایش افقی">
      <table className={styles.cohortTable}>
        <caption>
          Cohortهای روزانه بر اساس account_created. D1/D7/D30 فقط وقتی app_opened history واقعاً
          instrument شود مقدار می‌گیرند.
        </caption>
        <thead>
          <tr>
            <th scope="col">Cohort</th>
            <th scope="col">اندازه</th>
            <th scope="col">D1</th>
            <th scope="col">D7</th>
            <th scope="col">D30</th>
            <th scope="col">وضعیت منبع</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortDate}>
              <th scope="row">{formatDate(row.cohortDate)}</th>
              <td>
                {row.suppressed ? (
                  <span className={styles.suppressed}>
                    کمتر از {numberFormat.format(COHORT_SUPPRESSION_THRESHOLD)}
                  </span>
                ) : (
                  numberFormat.format(row.size ?? 0)
                )}
              </td>
              {row.retention.map((cell) => (
                <td key={cell.day} data-cell-state={cell.state}>
                  <RetentionValue cell={cell} />
                </td>
              ))}
              <td>
                <span className={styles.stateBadge} data-state={row.sourceState}>
                  {stateLabel(row.sourceState)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnavailableCard({ title, reason }: { title: string; reason: string }) {
  return (
    <article className={styles.unavailableCard}>
      <div className={styles.cardTopline}>
        <strong>{title}</strong>
        <span className={styles.stateBadge} data-state="unavailable">
          —
        </span>
      </div>
      <p>{reason}</p>
    </article>
  );
}

function CohortWorkspace({ report }: { report: AnalyticsCohortReport }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="cohort-hero-title">
        <div>
          <p className={styles.eyebrow}>Acquisition → Activation → Retention</p>
          <h2 id="cohort-hero-title">
            رشد را فقط جایی اندازه می‌گیریم که تاریخچه قابل اثبات داریم.
          </h2>
          <p>
            Acquisition فعلی از account_created واقعی می‌آید. Activation و D1/D7/D30 تا زمان
            instrumentation رویدادهای canonical عمداً «—» می‌مانند؛ last-active snapshot جایگزین
            تاریخچه retention نمی‌شود.
          </p>
        </div>
        <div className={styles.definitionPanel}>
          <span>Definition v{report.definition.version.toLocaleString("fa-IR")}</span>
          <strong>
            Taxonomy v{report.definition.eventTaxonomyVersion.toLocaleString("fa-IR")}
          </strong>
          <small>
            Asia/Tehran · suppression &lt;{" "}
            {numberFormat.format(report.definition.suppressionThreshold)}
          </small>
        </div>
      </section>

      <section className={styles.filterCard} aria-labelledby="cohort-filters-title">
        <div>
          <p className={styles.eyebrow}>Bounded query</p>
          <h3 id="cohort-filters-title">بازه cohort</h3>
          <p>حداکثر ۱۸۰ روز؛ محاسبات تاریخی بر اساس روز تقویمی تهران.</p>
        </div>
        <form className={styles.filters} method="get">
          <label>
            <span>از تاریخ</span>
            <input type="date" name="from" defaultValue={report.query.from} />
          </label>
          <label>
            <span>تا تاریخ</span>
            <input type="date" name="to" defaultValue={report.query.to} />
          </label>
          <label>
            <span>محصول</span>
            <select name="product" defaultValue={report.query.product ?? ""}>
              {products.map((product) => (
                <option value={product.value} key={product.value || "all"}>
                  {product.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
      </section>

      <section className={styles.summaryGrid} aria-label="خلاصه funnel">
        <article className={styles.summaryCard} data-tone="green">
          <span>Acquisition</span>
          <strong>
            {report.acquisition.total === null
              ? "—"
              : numberFormat.format(report.acquisition.total)}
          </strong>
          <p>account_created · {stateLabel(report.acquisition.state)}</p>
          <small>تا {formatDateTime(report.acquisition.asOfUtc)}</small>
        </article>
        <article className={styles.summaryCard} data-tone="blue">
          <span>Activation · ۷ روز</span>
          <strong>—</strong>
          <p>{report.activation.reason}</p>
        </article>
        <article className={styles.summaryCard} data-tone="violet">
          <span>Retention · D1 / D7 / D30</span>
          <strong>—</strong>
          <p>{report.retention.reason}</p>
        </article>
      </section>

      <section className={styles.sectionCard} aria-labelledby="cohort-table-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Cohort table</p>
            <h3 id="cohort-table-title">Cohortهای Acquisition</h3>
            <p>
              Cohortهای ۱ تا {numberFormat.format(report.definition.suppressionThreshold - 1)} نفر
              قبل از رسیدن به مرورگر suppress می‌شوند. صفر واقعی با unavailable یکی نیست.
            </p>
          </div>
          <span className={styles.stateBadge} data-state={report.acquisition.state}>
            {stateLabel(report.acquisition.state)}
          </span>
        </div>
        <CohortTable rows={report.retention.cohorts} />
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.sectionCard} aria-labelledby="channel-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Acquisition attribution</p>
              <h3 id="channel-title">کانال‌های جذب</h3>
            </div>
          </div>
          <UnavailableCard title="Channel attribution" reason={report.channels.reason} />
        </section>
        <section className={styles.sectionCard} aria-labelledby="churn-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Lifecycle</p>
              <h3 id="churn-title">Churn / Return</h3>
            </div>
          </div>
          <UnavailableCard title="Churn / Return" reason={report.churnReturn.reason} />
        </section>
      </div>

      <section className={styles.definitionCard} aria-labelledby="cohort-definition-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Auditable definition</p>
            <h3 id="cohort-definition-title">تعریف نسخه‌دار</h3>
          </div>
          <Link href="/analytics">بازگشت به KPIها</Link>
        </div>
        <dl className={styles.definitionList}>
          <div>
            <dt>Acquisition</dt>
            <dd>{report.definition.acquisitionEvent} v1</dd>
          </div>
          <div>
            <dt>Activation</dt>
            <dd>{report.definition.activationEvent} v1 · window 7d</dd>
          </div>
          <div>
            <dt>Retention</dt>
            <dd>{report.definition.retentionEvent} v1 · D1 / D7 / D30</dd>
          </div>
          <div>
            <dt>Privacy</dt>
            <dd>
              Aggregate only · suppression &lt;{" "}
              {numberFormat.format(report.definition.suppressionThreshold)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default async function CohortsPage({ searchParams }: CohortsPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("analytics.read");
  const result = canRead ? await getAnalyticsCohorts(filters(await searchParams)) : null;

  if (result?.kind === "unauthenticated") redirect("/login");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="Acquisition / Retention"
        subtitle="Cohortهای aggregate، تعریف نسخه‌دار و بدون retention ساختگی"
      >
        {!canRead || result?.kind === "forbidden" ? (
          <AdminPageState state="forbidden" />
        ) : result?.kind === "invalid" ? (
          <AdminPageState
            state="error"
            title="فیلتر cohort معتبر نیست"
            description={result.message}
          />
        ) : result?.kind === "unavailable" ? (
          <AdminPageState
            state="unavailable"
            description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
          />
        ) : result?.kind === "ok" ? (
          <CohortWorkspace report={result.data} />
        ) : (
          <AdminPageState state="unavailable" />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
