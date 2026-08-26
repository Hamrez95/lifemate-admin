import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceRevenue,
  type CommerceRevenueResponse,
  type RevenueMetric,
} from "@/src/lib/admin-api/commerce-revenue";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  CommerceDependencyGrid,
  CommerceWorkspaceHeader,
  CoreDependencyNotice,
} from "../CommerceWorkspaceHeader";
import styles from "../commerce-reference.module.css";

const number = new Intl.NumberFormat("fa-IR");
const metricLabels: Record<RevenueMetric["name"], string> = {
  mrr: "MRR جاری",
  arr: "ARR جاری",
  arpu: "ARPU",
  paid_conversion: "Paid conversion",
  revenue_churn: "Churn درآمدی",
  refund_amount: "Refund amount",
};

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function revenueParams(values: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "currency", "product", "plan"] as const) {
    const value = one(values[key]);
    if (value) params.set(key, value);
  }
  return params;
}

function metricValue(metric: RevenueMetric): string {
  if (metric.state === "unavailable" || metric.value === null) return "—";
  if (typeof metric.value === "number") return number.format(metric.value);
  return `${metric.value} minor-unit${metric.currency ? ` · ${metric.currency}` : ""}`;
}

function RevenueMetrics({ metrics }: { metrics: RevenueMetric[] }) {
  return (
    <section className={styles.metricGrid} aria-label="شاخص‌های درآمد canonical">
      {metrics.map((metric) => (
        <article className={styles.metricCard} data-tone="blue" key={metric.name}>
          <span>{metricLabels[metric.name]}</span>
          <strong aria-label={`${metricLabels[metric.name]} ${metric.state}`}>
            {metricValue(metric)}
          </strong>
          <small>
            {metric.state.toUpperCase()} · {metric.reason}
          </small>
        </article>
      ))}
    </section>
  );
}

function ActualCurrencyBreakdown({ data }: { data: CommerceRevenueResponse }) {
  return (
    <section className={styles.panel} aria-labelledby="actual-revenue-title">
      <header className={styles.panelHeader}>
        <div>
          <span>ACTUAL · NO FX</span>
          <h3 id="actual-revenue-title">Actual transaction facts به تفکیک ارز</h3>
          <p>
            این اعداد فقط succeeded transaction/refund fact هستند. واحد نمایش integer minor-unit است
            و تا زمانی که currency exponent canonical نباشد به major-unit تبدیل نمی‌شوند.
          </p>
        </div>
      </header>
      {data.actualByCurrency.length === 0 ? (
        <AdminPageState
          state={data.source.state === "unavailable" ? "unavailable" : "empty"}
          title={
            data.source.state === "unavailable"
              ? "ledger مالی canonical در این محیط deploy نشده است"
              : "Actual transaction در فیلتر فعلی وجود ندارد"
          }
          description={data.source.note}
        />
      ) : (
        <ul className={styles.list}>
          {data.actualByCurrency.map((row) => (
            <li key={row.currency}>
              <div>
                <strong>{row.currency}</strong>
                <br />
                <span>
                  succeeded: {row.succeededAmountMinor} minor-unit ·{" "}
                  {number.format(row.succeededTransactions)} transaction ·{" "}
                  {number.format(row.payingAccounts)} payer
                </span>
              </div>
              <span>
                refund:{" "}
                {row.refundedAmountMinor === null
                  ? "Unavailable"
                  : `${row.refundedAmountMinor} minor-unit`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActualTrend({ data }: { data: CommerceRevenueResponse }) {
  return (
    <section className={styles.panel} aria-labelledby="actual-trend-title">
      <header className={styles.panelHeader}>
        <div>
          <span>DAILY ACTUAL SERIES</span>
          <h3 id="actual-trend-title">روند روزانه بدون تبدیل ارز</h3>
          <p>هر ارز یک سری مستقل دارد؛ هیچ FX یا جمع چندارزی در مرورگر انجام نمی‌شود.</p>
        </div>
      </header>
      {data.series.length === 0 ? (
        <AdminPageState state="empty" title="سری روزانه قابل نمایش وجود ندارد" />
      ) : (
        <ul className={styles.list}>
          {data.series.slice(-60).map((point) => (
            <li key={`${point.date}-${point.currency}`}>
              <strong>
                {point.date} · {point.currency}
              </strong>
              <span>
                succeeded {point.succeededAmountMinor} · refund{" "}
                {point.refundedAmountMinor ?? "Unavailable"} minor-unit
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function RevenueContent({
  filters,
}: {
  filters: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = revenueParams(await filters);
  const result = await getCommerceRevenue(params);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر Revenue معتبر نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        title="Revenue API در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const { data } = result;
  return (
    <div className={styles.page} dir="rtl">
      <CommerceWorkspaceHeader
        active="revenue"
        eyebrow="Commerce · Reference 11 · Canonical revenue"
        title="درآمد واقعی، با مرزهای صریح داده"
        description="Actual transaction/refund فقط از ledger canonical می‌آید. MRR، ARR، ARPU، conversion و churn تا وقتی semantics واقعی billing/cohort ندارند صریحاً Unavailable می‌مانند."
      />

      <section className={styles.panel} aria-labelledby="revenue-filter-title">
        <header className={styles.panelHeader}>
          <div>
            <span>BOUNDED FILTERS</span>
            <h3 id="revenue-filter-title">فیلتر دوره و dimension</h3>
          </div>
        </header>
        <form method="get" className={styles.filterGrid}>
          <label>
            از
            <input type="date" name="from" defaultValue={params.get("from") ?? ""} />
          </label>
          <label>
            تا
            <input type="date" name="to" defaultValue={params.get("to") ?? ""} />
          </label>
          <label>
            Currency
            <input
              name="currency"
              dir="ltr"
              maxLength={3}
              pattern="[A-Za-z]{3}"
              defaultValue={params.get("currency") ?? ""}
              placeholder="IRR"
            />
          </label>
          <label>
            Product
            <input name="product" dir="ltr" defaultValue={params.get("product") ?? ""} />
          </label>
          <label>
            Plan
            <input name="plan" dir="ltr" defaultValue={params.get("plan") ?? ""} />
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
      </section>

      <RevenueMetrics metrics={data.kpis} />
      <div className={styles.sectionGrid}>
        <ActualCurrencyBreakdown data={data} />
        <ActualTrend data={data} />
      </div>

      <CommerceDependencyGrid>
        <CoreDependencyNotice title="Amount semantics" tone="info">
          تمام مبلغ‌ها raw integer minor-unit هستند. Currency exponent در قرارداد فعلی instrument
          نشده و UI هیچ تبدیل major-unit انجام نمی‌دهد.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Actual vs Forecast" tone="available">
          این endpoint فقط Actual transaction/refund fact می‌دهد. Budget/Forecast همچنان در Finance
          Scenario و خارج از این ledger نگه داشته می‌شوند.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="No implicit FX" tone="available">
          aggregate چندارزی ساخته نمی‌شود. برای Refund KPI عدد مستقیم فقط با فیلتر یک Currency نمایش
          داده می‌شود.
        </CoreDependencyNotice>
      </CommerceDependencyGrid>

      <section className={styles.panel} aria-labelledby="revenue-source-title">
        <header className={styles.panelHeader}>
          <div>
            <span>SOURCE · FRESHNESS</span>
            <h3 id="revenue-source-title">وضعیت منبع canonical</h3>
            <p>
              {data.source.state.toUpperCase()} · ledger: {data.source.ledger} · refund ledger:{" "}
              {data.source.refundLedger ?? "Unavailable"}
            </p>
            <p>{data.source.note}</p>
            <small>as of {data.freshness.asOfUtc}</small>
          </div>
        </header>
      </section>
    </div>
  );
}

type CommerceRevenuePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommerceRevenuePage({ searchParams }: CommerceRevenuePageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="درآمد"
        subtitle="Actual revenue evidence · recurring KPIها fail-closed"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت Revenue canonical" />}
          >
            <RevenueContent filters={searchParams} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
