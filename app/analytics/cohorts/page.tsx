import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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

import styles from "./cohorts-reference.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const number = new Intl.NumberFormat("fa-IR");
const percent = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  month: "short",
  day: "numeric",
});
const dateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});
const products = [
  { value: "", label: "همه محصولات" },
  { value: "wellmate", label: "WellMate" },
  { value: "caremate", label: "CareMate" },
  { value: "women_health", label: "سلامت بانوان" },
] as const;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
function filters(input: Record<string, string | string[] | undefined>) {
  const p = new URLSearchParams();
  for (const key of ["from", "to", "product"] as const) {
    const v = one(input[key]).trim();
    if (v) p.set(key, v);
  }
  return p;
}
function fmtDate(value: string) {
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? value : date.format(d);
}
function stateLabel(state: string) {
  return state === "ready"
    ? "آماده"
    : state === "partial"
      ? "داده محدود"
      : state === "suppressed"
        ? "محافظت‌شده"
        : "ناموجود";
}

function RetentionCellView({ cell }: { cell: RetentionCell }) {
  if (cell.state === "suppressed")
    return (
      <span className={styles.cellSuppressed} title={cell.reason ?? undefined}>
        خصوصی
      </span>
    );
  if (cell.state === "unavailable" || cell.rate === null)
    return (
      <span className={styles.cellUnavailable} title={cell.reason ?? undefined}>
        —
      </span>
    );
  return (
    <span
      className={styles.cellReady}
      style={
        { "--retention": `${Math.max(0, Math.min(100, cell.rate * 100))}%` } as React.CSSProperties
      }
    >
      {percent.format(cell.rate * 100)}٪
    </span>
  );
}

function Heatmap({ rows }: { rows: CohortRow[] }) {
  if (rows.length === 0)
    return (
      <AdminPageState
        state="empty"
        title="Cohort قابل نمایش وجود ندارد"
        description="سری acquisition معتبری از API canonical دریافت نشده است."
      />
    );
  return (
    <div
      className={styles.heatmapScroll}
      tabIndex={0}
      aria-label="نقشه حرارتی cohort، قابل پیمایش افقی"
    >
      <table className={styles.heatmap}>
        <caption>Retention D1 / D7 / D30 فقط از داده canonical و با suppression حریم خصوصی</caption>
        <thead>
          <tr>
            <th scope="col">شروع Cohort</th>
            <th scope="col">اندازه</th>
            <th scope="col">D1</th>
            <th scope="col">D7</th>
            <th scope="col">D30</th>
            <th scope="col">منبع</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortDate}>
              <th scope="row">{fmtDate(row.cohortDate)}</th>
              <td>
                {row.suppressed
                  ? `< ${number.format(COHORT_SUPPRESSION_THRESHOLD)}`
                  : number.format(row.size ?? 0)}
              </td>
              {row.retention.map((cell) => (
                <td key={cell.day} data-state={cell.state}>
                  <RetentionCellView cell={cell} />
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

function AcquisitionChart({ rows }: { rows: CohortRow[] }) {
  const points = rows.filter((r) => !r.suppressed && r.size !== null).slice(-24);
  if (points.length === 0)
    return (
      <AdminPageState
        state="unavailable"
        title="نمودار Acquisition قابل ساخت نیست"
        description="اندازه cohortها در این بازه موجود یا قابل نمایش نیست."
      />
    );
  const max = Math.max(...points.map((p) => p.size ?? 0), 1);
  const width = Math.max(520, points.length * 30);
  return (
    <div
      className={styles.chartScroll}
      tabIndex={0}
      aria-label="نمودار acquisition cohort، قابل پیمایش افقی"
    >
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} 230`}
        role="img"
        aria-label="اندازه cohortهای acquisition"
      >
        <line x1="30" x2={width - 18} y1="188" y2="188" className={styles.gridLine} />
        {points.map((point, index) => {
          const h = Math.max(3, ((point.size ?? 0) / max) * 142);
          const x = 36 + index * ((width - 72) / points.length);
          const label = `${fmtDate(point.cohortDate)}: ${number.format(point.size ?? 0)} کاربر`;
          return (
            <g
              key={point.cohortDate}
              tabIndex={0}
              role="img"
              aria-label={label}
              className={styles.barGroup}
            >
              <rect x={x} y={188 - h} width="14" height={h} rx="7" className={styles.bar}>
                <title>{label}</title>
              </rect>
              <text x={x + 7} y="210" textAnchor="middle">
                {index % Math.max(1, Math.ceil(points.length / 6)) === 0
                  ? fmtDate(point.cohortDate)
                  : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function UnavailablePanel({ title, reason }: { title: string; reason: string }) {
  return (
    <article className={styles.unavailablePanel}>
      <span>Unavailable</span>
      <strong>{title}</strong>
      <p>{reason}</p>
    </article>
  );
}

function Workspace({ report }: { report: AnalyticsCohortReport }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Cohort Retention · Reference 24</span>
          <h2>تحلیل ماندگاری گروهی</h2>
          <p>
            کدام cohortها می‌مانند و چه چیزی واقعاً قابل اثبات است؟ Acquisition فعلی واقعی است؛
            retention تا زمانی که تاریخچه canonical موجود نباشد «—» می‌ماند.
          </p>
        </div>
        <aside>
          <span>Definition</span>
          <strong>v{report.definition.version.toLocaleString("fa-IR")}</strong>
          <span>Suppression</span>
          <strong>&lt; {number.format(report.definition.suppressionThreshold)}</strong>
        </aside>
      </section>

      <section className={styles.toolbar}>
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
              {products.map((p) => (
                <option key={p.value || "all"} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
        <div className={styles.actions}>
          <button type="button" disabled title="endpoint canonical برای export cohort وجود ندارد">
            خروجی
          </button>
          <button
            type="button"
            disabled
            title="endpoint canonical برای drill-down cohort وجود ندارد"
          >
            Drill-down
          </button>
        </div>
      </section>

      <section className={styles.metricGrid} aria-label="شاخص‌های cohort">
        <article data-tone="green">
          <span>Acquisition</span>
          <strong>
            {report.acquisition.total === null ? "—" : number.format(report.acquisition.total)}
          </strong>
          <small>{stateLabel(report.acquisition.state)}</small>
        </article>
        <article data-tone="blue">
          <span>Activation · 7d</span>
          <strong>—</strong>
          <small>{report.activation.reason}</small>
        </article>
        <article data-tone="violet">
          <span>Retention D1/D7/D30</span>
          <strong>—</strong>
          <small>{report.retention.reason}</small>
        </article>
      </section>

      <section className={styles.heatmapCard}>
        <header>
          <div>
            <span className={styles.eyebrow}>نقشه حرارتی ماندگاری</span>
            <h3>Retention Cohorts</h3>
            <p>هر سلول فقط وقتی مقدار واقعی وجود داشته باشد رنگ می‌گیرد.</p>
          </div>
          <span className={styles.stateBadge} data-state={report.retention.state}>
            {stateLabel(report.retention.state)}
          </span>
        </header>
        <Heatmap rows={report.retention.cohorts} />
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.chartCard}>
          <header>
            <div>
              <span className={styles.eyebrow}>منحنی Acquisition</span>
              <h3>اندازه cohortهای واقعی</h3>
            </div>
          </header>
          <AcquisitionChart rows={report.retention.cohorts} />
          <p className={styles.chartHint}>tooltip با hover و focus کیبورد در دسترس است.</p>
        </section>
        <section className={styles.infoCard}>
          <span className={styles.eyebrow}>تعریف و شرایط شمول</span>
          <dl>
            <div>
              <dt>Acquisition</dt>
              <dd>{report.definition.acquisitionEvent}</dd>
            </div>
            <div>
              <dt>Activation</dt>
              <dd>
                {report.definition.activationEvent} · {report.definition.activationWindowDays}d
              </dd>
            </div>
            <div>
              <dt>Retention</dt>
              <dd>{report.definition.retentionEvent} · D1/D7/D30</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{report.definition.timezone}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className={styles.twoColumn}>
        <UnavailablePanel title="کانال‌های جذب" reason={report.channels.reason} />
        <UnavailablePanel title="Churn / Return" reason={report.churnReturn.reason} />
      </div>
      <section className={styles.footerMeta}>
        <span>آخرین تولید: {dateTime.format(new Date(report.generatedAtUtc))}</span>
        <span>Taxonomy v{report.definition.eventTaxonomyVersion.toLocaleString("fa-IR")}</span>
        <span>
          KPI Dictionary v{report.definition.kpiDictionaryVersion.toLocaleString("fa-IR")}
        </span>
        <Link href="/analytics/funnel">قیف فعال‌سازی</Link>
        <Link href="/analytics">نمای کلی Analytics</Link>
      </section>
    </div>
  );
}

async function Content({ query }: { query: URLSearchParams }) {
  const result = await getAnalyticsCohorts(query);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid")
    return (
      <AdminPageState state="error" title="فیلتر cohort معتبر نیست" description={result.message} />
    );
  if (result.kind === "unavailable")
    return (
      <AdminPageState
        state="unavailable"
        title="Cohort canonical در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  return <Workspace report={result.data} />;
}

export default async function CohortsPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("analytics.read");
  const query = filters(await searchParams);
  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="analytics"
        title="تحلیل ماندگاری گروهی"
        subtitle="Reference 24 · aggregate canonical cohorts"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت Cohortهای canonical" />}
          >
            <Content query={query} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
