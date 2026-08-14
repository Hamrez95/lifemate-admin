import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AdminDataTable,
  AdminPageState,
  AdminTableFilterBar,
  type AdminTableColumn,
} from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommerceOverview,
  type CommerceEntitlementCoverage,
  type CommerceOverviewResponse,
  type CommercePlanDistribution,
  type CommerceSubscriptionRow,
} from "@/src/lib/admin-api/commerce-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./commerce.module.css";

type CommercePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CommerceQuery = {
  page: number;
  pageSize: number;
  product: string;
  status: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabels: Record<string, string> = {
  Active: "فعال",
  Trial: "آزمایشی",
  PastDue: "سررسید گذشته",
  Cancelled: "لغوشده",
  Expired: "منقضی",
  Refunded: "بازپرداخت‌شده",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function boundedPage(value: string, fallback: number, max: number): number {
  if (!/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
}

function parseQuery(input: Record<string, string | string[] | undefined>): CommerceQuery {
  const pageSizeCandidate = boundedPage(one(input.pageSize), 25, 100);
  return {
    page: boundedPage(one(input.page), 1, 100_000),
    pageSize: [25, 50, 100].includes(pageSizeCandidate) ? pageSizeCandidate : 25,
    product: one(input.product).trim(),
    status: one(input.status).trim(),
  };
}

function apiParams(query: CommerceQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.product) params.set("product", query.product);
  if (query.status) params.set("status", query.status);
  return params;
}

function pageHref(query: CommerceQuery, page: number): string {
  const params = apiParams({ ...query, page: Math.max(1, page) });
  return `/commerce?${params.toString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "green" | "blue" | "orange" | "violet" | "neutral";
}) {
  return (
    <article className={styles.summaryCard} data-tone={tone}>
      <span>{label}</span>
      <strong>{value.toLocaleString("fa-IR")}</strong>
      <small>{hint}</small>
    </article>
  );
}

function CommerceHero({ data }: { data: CommerceOverviewResponse }) {
  const subscriptionTotal = Object.values(data.summary.subscriptions).reduce(
    (sum, value) => sum + value,
    0,
  );
  return (
    <section className={styles.hero} aria-labelledby="commerce-overview-title">
      <div className={styles.heroCopy}>
        <span>LifeMate Commerce Control</span>
        <h2 id="commerce-overview-title">اشتراک، پلن و دسترسی؛ سه مفهوم جدا و قابل فهم</h2>
        <p>
          این صفحه فقط وضعیت تجاری واقعی را نشان می‌دهد. اطلاعات کارت، مرجع پرداخت و شناسه‌های حساس
          provider عمداً وارد پنل نمی‌شوند.
        </p>
      </div>
      <div className={styles.heroStats}>
        <div>
          <strong>{subscriptionTotal.toLocaleString("fa-IR")}</strong>
          <span>کل اشتراک‌ها</span>
        </div>
        <div>
          <strong>{data.products.length.toLocaleString("fa-IR")}</strong>
          <span>محصول تجاری</span>
        </div>
        <div>
          <strong>{data.summary.entitlements.active.toLocaleString("fa-IR")}</strong>
          <span>Entitlement فعال</span>
        </div>
      </div>
    </section>
  );
}

function SummaryGrid({ data }: { data: CommerceOverviewResponse }) {
  const subscriptions = data.summary.subscriptions;
  return (
    <section className={styles.summaryGrid} aria-label="خلاصه وضعیت تجارت">
      <SummaryCard
        label="اشتراک فعال"
        value={subscriptions.active}
        hint="Subscription · Active"
        tone="green"
      />
      <SummaryCard
        label="آزمایشی"
        value={subscriptions.trial}
        hint="Subscription · Trial"
        tone="blue"
      />
      <SummaryCard
        label="سررسید گذشته"
        value={subscriptions.pastDue}
        hint="نیازمند پیگیری عملیاتی"
        tone="orange"
      />
      <SummaryCard
        label="لغوشده"
        value={subscriptions.cancelled}
        hint="Subscription · Cancelled"
        tone="neutral"
      />
      <SummaryCard
        label="منقضی"
        value={subscriptions.expired}
        hint="Subscription · Expired"
        tone="violet"
      />
      <SummaryCard
        label="Entitlement فعال"
        value={data.summary.entitlements.active}
        hint="دسترسی قابلیت، نه اشتراک"
        tone="blue"
      />
    </section>
  );
}

function PlanDistribution({ rows }: { rows: CommercePlanDistribution[] }) {
  return (
    <section className={styles.panel} aria-labelledby="plan-distribution-title">
      <header className={styles.panelHeader}>
        <div>
          <span>Plan</span>
          <h3 id="plan-distribution-title">توزیع پلن‌ها</h3>
          <p>پلن تعریف تجاری محصول است؛ با Subscription کاربر یکی نیست.</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <AdminPageState state="empty" title="پلنی برای این فیلتر پیدا نشد" />
      ) : (
        <div className={styles.planGrid}>
          {rows.map((row) => (
            <Link
              className={styles.planCard}
              href={`/commerce/plans/${row.planId}`}
              key={row.planId}
            >
              <div>
                <span className={styles.productBadge}>{row.productName}</span>
                <span className={styles.statusPill} data-status={row.planStatus}>
                  {row.planStatus === "Active" ? "فعال" : "بازنشسته"}
                </span>
              </div>
              <strong>{row.planName}</strong>
              <code>{row.planCode}</code>
              <dl>
                <div>
                  <dt>کل Subscription</dt>
                  <dd>{row.subscriptions.toLocaleString("fa-IR")}</dd>
                </div>
                <div>
                  <dt>جاری</dt>
                  <dd>{row.activeSubscriptions.toLocaleString("fa-IR")}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function EntitlementCoverage({ rows }: { rows: CommerceEntitlementCoverage[] }) {
  return (
    <section className={styles.panel} aria-labelledby="entitlement-title">
      <header className={styles.panelHeader}>
        <div>
          <span>Entitlement</span>
          <h3 id="entitlement-title">پوشش قابلیت‌ها</h3>
          <p>
            Entitlement یعنی دسترسی واقعی به یک Feature؛ ممکن است از اشتراک، Trial، Gift یا منبع
            دیگر آمده باشد.
          </p>
        </div>
      </header>
      {rows.length === 0 ? (
        <AdminPageState state="empty" title="Entitlement قابل نمایشی وجود ندارد" />
      ) : (
        <div className={styles.entitlementList}>
          {rows.slice(0, 12).map((row) => {
            const total = row.active + row.expired + row.revoked;
            const activePercent = total > 0 ? Math.round((row.active / total) * 100) : 0;
            return (
              <Link
                href={`/commerce/entitlements/${encodeURIComponent(row.featureCode)}`}
                className={styles.entitlementRow}
                key={row.featureCode}
              >
                <div className={styles.entitlementName}>
                  <code>{row.featureCode}</code>
                  <span>{row.active.toLocaleString("fa-IR")} فعال</span>
                </div>
                <div
                  className={styles.entitlementMeter}
                  aria-label={`${activePercent.toLocaleString("fa-IR")} درصد فعال`}
                >
                  <span style={{ width: `${activePercent}%` }} />
                </div>
                <small>
                  {row.expired.toLocaleString("fa-IR")} منقضی ·{" "}
                  {row.revoked.toLocaleString("fa-IR")} لغوشده
                </small>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Highlights({ data }: { data: CommerceOverviewResponse }) {
  return (
    <section className={styles.highlightGrid} aria-label="سررسیدهای تجارت">
      <article className={styles.highlightPanel}>
        <header>
          <span>Subscription</span>
          <h3>نزدیک‌ترین پایان دوره‌ها</h3>
        </header>
        {data.renewalHighlights.length === 0 ? (
          <p className={styles.emptyHint}>دوره فعالی با تاریخ پایان ثبت نشده است.</p>
        ) : (
          <ul>
            {data.renewalHighlights.map((item) => (
              <li key={item.subscriptionId}>
                <div>
                  <strong>{item.planName}</strong>
                  <small>
                    {item.productCode} · {statusLabels[item.status] ?? item.status}
                  </small>
                </div>
                <time dateTime={item.currentPeriodEndUtc}>
                  {formatDateTime(item.currentPeriodEndUtc)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </article>
      <article className={styles.highlightPanel}>
        <header>
          <span>Entitlement</span>
          <h3>نزدیک‌ترین انقضای دسترسی‌ها</h3>
        </header>
        {data.entitlementExpiryHighlights.length === 0 ? (
          <p className={styles.emptyHint}>Entitlement فعالی با انقضای مشخص ثبت نشده است.</p>
        ) : (
          <ul>
            {data.entitlementExpiryHighlights.map((item) => (
              <li key={item.entitlementId}>
                <div>
                  <strong>{item.featureCode}</strong>
                  <small>{item.source}</small>
                </div>
                <time dateTime={item.expiresAtUtc}>{formatDateTime(item.expiresAtUtc)}</time>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

const subscriptionColumns: readonly AdminTableColumn<CommerceSubscriptionRow>[] = [
  {
    key: "product",
    header: "محصول",
    render: (row) => <span className={styles.productBadge}>{row.productName}</span>,
  },
  {
    key: "plan",
    header: "پلن",
    render: (row) => (
      <div className={styles.tablePlan}>
        <Link href={`/commerce/plans/${row.planId}`}>{row.planName}</Link>
        <code>{row.planCode}</code>
      </div>
    ),
  },
  {
    key: "status",
    header: "وضعیت Subscription",
    render: (row) => (
      <span className={styles.statusPill} data-status={row.status}>
        {statusLabels[row.status] ?? row.status}
      </span>
    ),
  },
  {
    key: "start",
    header: "شروع",
    render: (row) => formatDateTime(row.startsAtUtc),
  },
  {
    key: "period-end",
    header: "پایان دوره",
    render: (row) => formatDateTime(row.currentPeriodEndUtc),
  },
  {
    key: "id",
    header: "Subscription ID",
    render: (row) => <code className={styles.identifier}>{row.subscriptionId}</code>,
    hideOnMobile: true,
  },
];

function Filters({ query, data }: { query: CommerceQuery; data: CommerceOverviewResponse }) {
  return (
    <AdminTableFilterBar action="/commerce" clearHref="/commerce" ariaLabel="فیلتر تجارت">
      <input type="hidden" name="page" value="1" />
      <div className="admin-list-filter">
        <label htmlFor="commerce-product">محصول</label>
        <select id="commerce-product" name="product" defaultValue={query.product}>
          <option value="">همه محصولات</option>
          {data.products.map((product) => (
            <option key={product.id} value={product.code}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="commerce-status">وضعیت Subscription</label>
        <select id="commerce-status" name="status" defaultValue={query.status}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter admin-list-filter--compact">
        <label htmlFor="commerce-page-size">تعداد در صفحه</label>
        <select id="commerce-page-size" name="pageSize" defaultValue={String(query.pageSize)}>
          <option value="25">۲۵</option>
          <option value="50">۵۰</option>
          <option value="100">۱۰۰</option>
        </select>
      </div>
    </AdminTableFilterBar>
  );
}

async function CommerceContent({ query }: { query: CommerceQuery }) {
  const result = await getCommerceOverview(apiParams(query));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر تجارت معتبر نیست"
        description="محصول و وضعیت را از گزینه‌های مجاز انتخاب کن."
      />
    );
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const { data } = result;
  const previousHref = data.page > 1 ? pageHref(query, data.page - 1) : undefined;
  const nextHref =
    data.page * data.pageSize < data.subscriptions.total
      ? pageHref(query, data.page + 1)
      : undefined;

  return (
    <div className={styles.page}>
      <CommerceHero data={data} />
      <SummaryGrid data={data} />
      <Filters query={query} data={data} />
      <div className={styles.contextStrip}>
        <span>منبع: commerce canonical model</span>
        <span>آخرین دریافت: {formatDateTime(data.freshness.asOfUtc)}</span>
        <span>هیچ مقدار درآمدی در این تسک حدس زده نشده است</span>
      </div>
      <div className={styles.twoColumn}>
        <PlanDistribution rows={data.planDistribution} />
        <EntitlementCoverage rows={data.entitlementCoverage} />
      </div>
      <Highlights data={data} />
      <AdminDataTable
        title="Subscriptionها"
        description="این جدول Subscription است؛ Plan و Entitlement در بلوک‌های جدا بالا نمایش داده می‌شوند."
        rows={data.subscriptions.items}
        columns={subscriptionColumns}
        rowKey={(row) => row.subscriptionId}
        total={data.subscriptions.total}
        freshness={{
          status: data.freshness.status,
          label: `آخرین دریافت: ${formatDateTime(data.freshness.asOfUtc)}`,
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.subscriptions.total,
          previousHref,
          nextHref,
        }}
      />
    </div>
  );
}

export default async function CommercePage({ searchParams }: CommercePageProps) {
  const admin = await requireAdminAccess();
  const query = parseQuery(await searchParams);
  const canReadCommerce = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="فروش و تجارت"
        subtitle="نمای قابل اعتماد از Plan، Subscription و Entitlement"
      >
        {!canReadCommerce ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت وضعیت تجارت" />}>
            <CommerceContent query={query} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
