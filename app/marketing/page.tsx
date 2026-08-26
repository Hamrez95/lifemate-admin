import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getMarketingOverview,
  type MarketingOverviewReport,
} from "@/src/lib/admin-api/marketing-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./marketing.module.css";

type MarketingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const numberFormat = new Intl.NumberFormat("fa-IR");
const dateTimeFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "short",
  timeStyle: "short",
});
const productOptions = [
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

function formatAsOf(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

function MarketingWorkspace({ report }: { report: MarketingOverviewReport }) {
  const acquisitionValue =
    report.acquisition.total === null ? "—" : numberFormat.format(report.acquisition.total);
  const maximum = Math.max(...report.acquisition.series.map((point) => point.value), 1);
  const attribution = report.attribution;
  const lifecycleTotals = attribution?.items.reduce(
    (total, item) => ({
      campaigns: total.campaigns + item.campaignCount,
      active: total.active + item.activeCampaignCount,
      completed: total.completed + item.completedCampaignCount,
    }),
    { campaigns: 0, active: 0, completed: 0 },
  ) ?? { campaigns: 0, active: 0, completed: 0 };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="marketing-hero-title">
        <div>
          <p className={styles.eyebrow}>Marketing intelligence</p>
          <h2 id="marketing-hero-title">عملکرد lifecycle را می‌بینیم؛ attribution تجاری را حدس نمی‌زنیم.</h2>
          <p>
            Campaign، product و channel از مدل canonical Core خوانده می‌شوند. Spend، revenue، conversion،
            CAC و ROAS تا زمان instrument شدن fact واقعی صریحاً unavailable می‌مانند.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.stateBadge} data-state={attribution ? "partial" : "unavailable"}>
            {attribution ? "Lifecycle واقعی · Attribution ناقص" : "Attribution unavailable"}
          </span>
          <strong>آخرین منبع Marketing</strong>
          <span>{formatAsOf(attribution?.freshness.asOfUtc ?? report.acquisition.asOfUtc)}</span>
          <Link href="/marketing/campaigns" className={styles.campaignLink}>مدیریت کمپین‌ها</Link>
          <Link href="/marketing/content-studio" className={styles.campaignLink}>AI Content Studio</Link>
        </div>
      </section>

      <section className={styles.filterCard} aria-labelledby="marketing-filter-title">
        <div>
          <p className={styles.eyebrow}>Bounded filters</p>
          <h3 id="marketing-filter-title">بازه و محصول</h3>
          <p>حداکثر ۱۸۰ روز؛ تمام داده‌ها از قراردادهای server-side canonical خوانده می‌شوند.</p>
        </div>
        <form className={styles.filters} method="get">
          <label><span>از تاریخ</span><input type="date" name="from" defaultValue={report.query.from} /></label>
          <label><span>تا تاریخ</span><input type="date" name="to" defaultValue={report.query.to} /></label>
          <label>
            <span>محصول</span>
            <select name="product" defaultValue={report.query.product ?? ""}>
              {productOptions.map((option) => (
                <option value={option.value} key={option.value || "all"}>{option.label}</option>
              ))}
            </select>
          </label>
          <button type="submit">اعمال فیلتر</button>
        </form>
      </section>

      <section className={styles.summaryGrid} aria-label="خلاصه شاخص‌های بازاریابی">
        <article className={styles.summaryCard} data-tone="green">
          <span>Acquisition · account_created</span><strong>{acquisitionValue}</strong>
          <p>{report.acquisition.reason ?? report.acquisition.source}</p>
          <small>منبع: {report.acquisition.source}</small>
        </article>
        <article className={styles.summaryCard} data-tone="blue">
          <span>Campaign lifecycle</span>
          <strong>{attribution ? numberFormat.format(lifecycleTotals.campaigns) : "—"}</strong>
          <p>{attribution ? `${numberFormat.format(lifecycleTotals.active)} فعال · ${numberFormat.format(lifecycleTotals.completed)} تکمیل‌شده` : report.attributionReason}</p>
        </article>
        <article className={styles.summaryCard} data-tone="orange">
          <span>Commercial attribution</span><strong>—</strong>
          <p>{attribution?.taxonomy.note ?? report.attributionReason}</p>
        </article>
      </section>

      <section className={styles.sectionCard} aria-labelledby="acquisition-trend-title">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Real acquisition trend</p><h3 id="acquisition-trend-title">روند ایجاد حساب</h3><p>این نمودار فقط از series واقعی `accounts_created` ساخته می‌شود.</p></div>
          <span className={styles.stateBadge} data-state={report.acquisition.state}>{report.acquisition.state}</span>
        </div>
        {report.acquisition.series.length === 0 ? (
          <AdminPageState state="empty" title="روند Acquisition قابل نمایش نیست" description="منبع واقعی برای این دسترسی/فیلتر در دسترس نیست؛ نمودار نمایشی ساخته نمی‌شود." />
        ) : (
          <div className={styles.bars} role="img" aria-label={`روند روزانه ایجاد حساب؛ مجموع ${acquisitionValue}`}>
            {report.acquisition.series.map((point) => (
              <div className={styles.barColumn} key={point.date}>
                <div className={styles.barTrack}><span className={styles.barFill} style={{ height: `${Math.max(3, (point.value / maximum) * 100)}%` }} title={`${point.date}: ${numberFormat.format(point.value)}`} /></div>
                <span className={styles.barValue}>{numberFormat.format(point.value)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className={styles.twoColumn}>
        <section className={styles.sectionCard} aria-labelledby="channels-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Canonical lifecycle dimensions</p><h3 id="channels-title">Product / Channel</h3></div>
            <span className={styles.stateBadge} data-state={attribution ? "partial" : "unavailable"}>{attribution ? "Partial" : "Unavailable"}</span>
          </div>
          {!attribution ? (
            <div className={styles.unavailableBox}><strong>—</strong><p>{report.attributionReason}</p></div>
          ) : attribution.items.length === 0 ? (
            <AdminPageState state="empty" title="کمپینی در این بازه ثبت نشده است" />
          ) : (
            <div className={styles.metricList}>
              {attribution.items.map((item, index) => (
                <article className={styles.metricRow} key={`${item.productCode ?? "all"}-${item.channelCode ?? "unknown"}-${index}`}>
                  <div><strong>{item.productCode ?? "بدون محصول"} · {item.channelCode ?? "بدون کانال"}</strong><span>{numberFormat.format(item.campaignCount)} کمپین</span></div>
                  <small>{numberFormat.format(item.activeCampaignCount)} فعال · {numberFormat.format(item.completedCampaignCount)} تکمیل‌شده</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.sectionCard} aria-labelledby="campaign-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Explicit unknowns</p><h3 id="campaign-title">Performance attribution</h3></div>
            <span className={styles.stateBadge} data-state="not_instrumented">Not instrumented</span>
          </div>
          <div className={styles.metricList}>
            {(attribution?.performanceMetrics ?? []).map((metric) => (
              <article className={styles.metricRow} key={metric.name}><div><strong>{metric.name.toUpperCase()}</strong><span>—</span></div><small>{metric.reason}</small></article>
            ))}
            {!attribution ? <div className={styles.unavailableBox}><strong>—</strong><p>{report.attributionReason}</p></div> : null}
          </div>
        </section>
      </div>

      {attribution ? <p>منبع: {attribution.freshness.source} · {attribution.freshness.note}</p> : null}
    </div>
  );
}

export default async function MarketingPage({ searchParams }: MarketingPageProps) {
  const admin = await requireAdminAccess();
  const canReadMarketing = admin.permissions.includes("marketing.read");
  const result = canReadMarketing
    ? await getMarketingOverview(filters(await searchParams), admin.permissions)
    : null;

  if (result?.kind === "unavailable" && result.correlationId === "unauthenticated") redirect("/login");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell activeSlug="marketing" title="Marketing" subtitle="Lifecycle واقعی، attribution صریح و بدون عدد نمایشی">
        {!canReadMarketing ? <AdminPageState state="forbidden" /> : result?.kind === "invalid" ? (
          <AdminPageState state="error" title="فیلتر بازاریابی معتبر نیست" description={result.message} />
        ) : result?.kind === "unavailable" ? (
          <AdminPageState state="unavailable" description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined} />
        ) : result?.kind === "ok" ? <MarketingWorkspace report={result.data} /> : <AdminPageState state="unavailable" />}
      </AdminShell>
    </AdminSessionProvider>
  );
}
