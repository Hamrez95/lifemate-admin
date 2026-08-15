import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import {
  AdminDataTable,
  AdminPageState,
  type AdminTableColumn,
} from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCommercePlanDetail,
  type CommercePlanDetail,
} from "@/src/lib/admin-api/commerce-detail";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../../detail.module.css";

type PlanDetailPageProps = {
  params: Promise<{ planId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SubscriptionRow = CommercePlanDetail["subscriptions"]["items"][number];

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
  Retired: "بازنشسته",
  Trial: "آزمایشی",
  PastDue: "سررسید گذشته",
  Cancelled: "لغوشده",
  Expired: "منقضی",
  Refunded: "بازپرداخت‌شده",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function pageNumber(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function formatIntegerString(value: string): string {
  const grouped = value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const digits = "۰۱۲۳۴۵۶۷۸۹";
  return grouped.replace(/\d/g, (digit) => digits[Number(digit)]);
}

function detailParams(page: number): URLSearchParams {
  return new URLSearchParams({ page: String(Math.max(1, page)), pageSize: "25" });
}

function pageHref(planId: string, page: number): string {
  return `/commerce/plans/${planId}?${detailParams(page).toString()}`;
}

function Hero({ data }: { data: CommercePlanDetail }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMain}>
        <Link className={styles.backLink} href="/commerce">
          بازگشت به فروش و تجارت
        </Link>
        <span className={styles.eyebrow}>LifeMate Commerce · Plan Detail</span>
        <div className={styles.titleRow}>
          <h2>{data.plan.name}</h2>
          <span className={styles.statusBadge} data-status={data.plan.status}>
            {statusLabels[data.plan.status] ?? data.plan.status}
          </span>
          <span className={styles.productBadge}>{data.product.name}</span>
        </div>
        <p>
          تعریف تجاری این پلن، قیمت‌های ثبت‌شده، قواعد Feature و Subscriptionهای مرتبط؛ بدون داده
          پرداخت حساس یا اطلاعات هویتی کاربر.
        </p>
      </div>
      <div className={styles.heroMeta}>
        <div>
          <span>کد پلن</span>
          <strong className={styles.code}>{data.plan.code}</strong>
        </div>
        <div>
          <span>Snapshot</span>
          <strong>{formatDateTime(data.freshness.asOfUtc)}</strong>
        </div>
      </div>
    </section>
  );
}

function PlanFacts({ data }: { data: CommercePlanDetail }) {
  return (
    <div className={styles.facts} aria-label="مشخصات پلن">
      <div className={styles.fact}>
        <span>محصول</span>
        <strong>{data.product.name}</strong>
        <code>{data.product.code}</code>
      </div>
      <div className={styles.fact}>
        <span>وضعیت محصول</span>
        <strong>{statusLabels[data.product.status] ?? data.product.status}</strong>
      </div>
      <div className={styles.fact}>
        <span>ایجاد پلن</span>
        <strong>{formatDateTime(data.plan.createdAtUtc)}</strong>
      </div>
      <div className={styles.fact}>
        <span>Plan ID</span>
        <code title={data.plan.id}>{data.plan.id}</code>
      </div>
    </div>
  );
}

function SubscriptionSummary({ data }: { data: CommercePlanDetail }) {
  const values = [
    ["کل", data.subscriptionSummary.total],
    ["فعال", data.subscriptionSummary.active],
    ["آزمایشی", data.subscriptionSummary.trial],
    ["سررسید گذشته", data.subscriptionSummary.pastDue],
    [
      "منقضی/لغو/بازپرداخت",
      data.subscriptionSummary.expired +
        data.subscriptionSummary.cancelled +
        data.subscriptionSummary.refunded,
    ],
  ] as const;
  return (
    <section className={styles.summaryGrid} aria-label="خلاصه Subscriptionهای پلن">
      {values.map(([label, value]) => (
        <article className={styles.summaryCard} key={label}>
          <span>{label}</span>
          <strong>{value.toLocaleString("fa-IR")}</strong>
        </article>
      ))}
    </section>
  );
}

function FeatureRules({ data }: { data: CommercePlanDetail }) {
  return (
    <section className={styles.section} aria-labelledby="plan-features-title">
      <header className={styles.sectionHeader}>
        <div>
          <span>PRODUCT FEATURE RULES</span>
          <h3 id="plan-features-title">قواعد قابلیت‌های محصول</h3>
          <p>
            `minimumPlanCode` همان قانون ثبت‌شده در مدل Commerce است؛ ترتیب یا entitlement اضافی از
            روی نام پلن حدس زده نمی‌شود.
          </p>
        </div>
      </header>
      {data.featureRules.items.length === 0 ? (
        <AdminPageState state="empty" title="قاعده Feature برای این محصول ثبت نشده" />
      ) : (
        <>
          {data.featureRules.total > data.featureRules.items.length ? (
            <p className={styles.emptyNote}>
              {data.featureRules.items.length.toLocaleString("fa-IR")} قاعده از مجموع {" "}
              {data.featureRules.total.toLocaleString("fa-IR")} قاعده نمایش داده می‌شود.
            </p>
          ) : null}
          <div className={styles.ruleGrid}>
            {data.featureRules.items.map((rule) => (
              <article className={styles.ruleCard} key={rule.featureId}>
                <header>
                  <strong className={styles.code}>{rule.featureCode}</strong>
                  <span className={styles.ruleBadge}>
                    {rule.minimumPlanCode ? `حداقل ${rule.minimumPlanCode}` : "بدون حداقل پلن"}
                  </span>
                </header>
                <p>{rule.description}</p>
                <Link href={`/commerce/entitlements/${encodeURIComponent(rule.featureCode)}`}>
                  مشاهده جزئیات Entitlement
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Prices({ data }: { data: CommercePlanDetail }) {
  return (
    <section className={styles.section} aria-labelledby="plan-prices-title">
      <header className={styles.sectionHeader}>
        <div>
          <span>PRICE HISTORY</span>
          <h3 id="plan-prices-title">قیمت‌های ثبت‌شده</h3>
          <p>
            مبلغ به شکل `amount_minor` و بدون تفسیر اعشار ارز نمایش داده می‌شود؛ مقدار bigint نیز به
            رشته نگه داشته شده تا دقت عددی از بین نرود.
          </p>
        </div>
      </header>
      {data.prices.items.length === 0 ? (
        <AdminPageState state="empty" title="قیمتی برای این پلن ثبت نشده" />
      ) : (
        <>
          {data.prices.total > data.prices.items.length ? (
            <p className={styles.emptyNote}>
              {data.prices.items.length.toLocaleString("fa-IR")} قیمت اخیر از مجموع {" "}
              {data.prices.total.toLocaleString("fa-IR")} رکورد نمایش داده می‌شود.
            </p>
          ) : null}
          <div className={styles.priceGrid}>
            {data.prices.items.map((price) => (
              <article className={styles.priceCard} key={price.priceId}>
                <header>
                  <strong>
                    {formatIntegerString(price.amountMinor)} {price.currency}
                  </strong>
                  <span className={styles.statusBadge} data-status={price.status}>
                    {statusLabels[price.status] ?? price.status}
                  </span>
                </header>
                <div className={styles.priceMeta}>
                  <span>{price.storeProvider}</span>
                  <span>{price.countryCode ?? "همه کشورها"}</span>
                  <span>{price.billingPeriodMonths.toLocaleString("fa-IR")} ماهه</span>
                </div>
                <p>
                  از {formatDateTime(price.effectiveFromUtc)} تا {formatDateTime(price.effectiveToUtc)}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const subscriptionColumns: readonly AdminTableColumn<SubscriptionRow>[] = [
  {
    key: "id",
    header: "Subscription ID",
    render: (row) => <code className={styles.identifier}>{row.subscriptionId}</code>,
  },
  {
    key: "status",
    header: "وضعیت",
    render: (row) => (
      <span className={styles.statusBadge} data-status={row.status}>
        {statusLabels[row.status] ?? row.status}
      </span>
    ),
  },
  { key: "start", header: "شروع", render: (row) => formatDateTime(row.startsAtUtc) },
  {
    key: "period-end",
    header: "پایان دوره",
    render: (row) => formatDateTime(row.currentPeriodEndUtc),
  },
  {
    key: "updated",
    header: "آخرین تغییر",
    render: (row) => formatDateTime(row.updatedAtUtc),
    hideOnMobile: true,
  },
];

function InstrumentationGaps({ data }: { data: CommercePlanDetail }) {
  const gaps = [
    ["تاریخچه تغییرات پلن", data.changeHistory],
    ["ارتباط Transaction / Order", data.transactionLinkage],
  ] as const;
  return (
    <section className={styles.timelineSection} aria-labelledby="plan-instrumentation-title">
      <header className={styles.sectionHeader}>
        <div>
          <span>DATA COVERAGE</span>
          <h3 id="plan-instrumentation-title">پوشش داده و تاریخچه</h3>
        </div>
      </header>
      {gaps.map(([label, gap]) => (
        <p className={styles.emptyNote} key={label}>
          <strong>{label}:</strong>{" "}
          {gap.instrumented
            ? "منبع داده فعال است."
            : `هنوز instrument نشده و داده نمایشی ساخته نمی‌شود. ${gap.reason}`}
        </p>
      ))}
    </section>
  );
}

async function PlanContent({ planId, page }: { planId: string; page: number }) {
  const result = await getCommercePlanDetail(planId, detailParams(page));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return <AdminPageState state="error" title="درخواست پلن معتبر نیست" />;
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const data = result.data;
  const previousHref = data.page > 1 ? pageHref(planId, data.page - 1) : undefined;
  const nextHref =
    data.page * data.pageSize < data.subscriptions.total
      ? pageHref(planId, data.page + 1)
      : undefined;

  return (
    <div className={styles.page}>
      <Hero data={data} />
      {data.plan.status === "Retired" || data.product.status === "Retired" ? (
        <div className={styles.warning}>
          <strong>هشدار lifecycle:</strong> این پلن یا محصول بازنشسته است؛ وضعیت را به‌عنوان داده تاریخی
          بخوان و فعال بودن دسترسی کاربران را از Entitlement نتیجه بگیر، نه از Plan.
        </div>
      ) : null}
      <PlanFacts data={data} />
      <SubscriptionSummary data={data} />
      <FeatureRules data={data} />
      <Prices data={data} />
      <AdminDataTable
        title="Subscriptionهای مرتبط"
        description="فهرست حداقلی و صفحه‌بندی‌شده؛ شناسه حساب، شخص، provider reference و داده پرداخت نمایش داده نمی‌شود."
        rows={data.subscriptions.items}
        columns={subscriptionColumns}
        rowKey={(row) => row.subscriptionId}
        total={data.subscriptions.total}
        freshness={{
          status: data.freshness.status,
          label: formatDateTime(data.freshness.asOfUtc),
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.subscriptions.total,
          previousHref,
          nextHref,
          ariaLabel: "صفحه‌بندی Subscriptionهای پلن",
        }}
      />
      <InstrumentationGaps data={data} />
    </div>
  );
}

export default async function PlanDetailPage({ params, searchParams }: PlanDetailPageProps) {
  const admin = await requireAdminAccess();
  const { planId } = await params;
  const query = await searchParams;
  const page = pageNumber(first(query.page));
  const canReadCommerce = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="جزئیات پلن"
        subtitle="Plan metadata، Feature rules، قیمت و Subscriptionهای مرتبط"
      >
        {!canReadCommerce ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت جزئیات پلن" />}>
            <PlanContent planId={planId} page={page} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
