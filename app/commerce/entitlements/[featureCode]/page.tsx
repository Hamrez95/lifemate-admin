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
  getCommerceEntitlementDetail,
  type CommerceEntitlementDetail,
} from "@/src/lib/admin-api/commerce-detail";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "../../detail.module.css";

type EntitlementDetailPageProps = {
  params: Promise<{ featureCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type EntitlementRow = CommerceEntitlementDetail["entitlements"]["items"][number];

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
  Scheduled: "زمان‌بندی‌شده",
  Revoked: "لغوشده",
  Expired: "منقضی",
  Retired: "بازنشسته",
};

const targetLabels: Record<string, string> = {
  Account: "حساب",
  Person: "شخص",
  AccountAndPerson: "حساب + شخص",
};

const eventLabels: Record<string, string> = {
  Granted: "دسترسی اعطا شد",
  Renewed: "تمدید شد",
  Expired: "منقضی شد",
  Cancelled: "لغو شد",
  Revoked: "بازپس‌گیری شد",
  Refunded: "بازپرداخت شد",
  Chargeback: "Chargeback",
  TrialStarted: "Trial شروع شد",
  TrialConverted: "Trial تبدیل شد",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function pageNumber(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function detailParams(page: number): URLSearchParams {
  return new URLSearchParams({ page: String(Math.max(1, page)), pageSize: "25" });
}

function pageHref(featureCode: string, page: number): string {
  return `/commerce/entitlements/${encodeURIComponent(featureCode)}?${detailParams(page).toString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function Hero({ data }: { data: CommerceEntitlementDetail }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMain}>
        <Link className={styles.backLink} href="/commerce">
          بازگشت به فروش و تجارت
        </Link>
        <span className={styles.eyebrow}>LifeMate Commerce · Entitlement Detail</span>
        <div className={styles.titleRow}>
          <h2 className={styles.code}>{data.feature.code}</h2>
          <span className={styles.productBadge}>Feature</span>
        </div>
        <p>{data.feature.description}</p>
      </div>
      <div className={styles.heroMeta}>
        <div>
          <span>Feature ID</span>
          <strong className={styles.code}>{data.feature.id}</strong>
        </div>
        <div>
          <span>Snapshot</span>
          <strong>{formatDateTime(data.freshness.asOfUtc)}</strong>
        </div>
      </div>
    </section>
  );
}

function Summary({ data }: { data: CommerceEntitlementDetail }) {
  const values = [
    ["کل Grantها", data.summary.total],
    ["فعال مؤثر", data.summary.active],
    ["زمان‌بندی‌شده", data.summary.scheduled],
    ["منقضی", data.summary.expired],
    ["لغوشده", data.summary.revoked],
  ] as const;
  return (
    <section className={styles.summaryGrid} aria-label="خلاصه Entitlement">
      {values.map(([label, value]) => (
        <article className={styles.summaryCard} key={label}>
          <span>{label}</span>
          <strong>{value.toLocaleString("fa-IR")}</strong>
        </article>
      ))}
    </section>
  );
}

function ProductRules({ data }: { data: CommerceEntitlementDetail }) {
  return (
    <section className={styles.section} aria-labelledby="entitlement-rules-title">
      <header className={styles.sectionHeader}>
        <div>
          <span>PRODUCT RULES</span>
          <h3 id="entitlement-rules-title">قواعد محصول و حداقل پلن</h3>
          <p>
            این بخش فقط mapping واقعی `product_features` را نشان می‌دهد؛ Promotion و Grantهای موردی
            در این قانون ادغام نمی‌شوند.
          </p>
        </div>
      </header>
      {data.productRules.items.length === 0 ? (
        <AdminPageState state="empty" title="این Feature به محصولی map نشده است" />
      ) : (
        <>
          {data.productRules.total > data.productRules.items.length ? (
            <p className={styles.emptyNote}>
              {data.productRules.items.length.toLocaleString("fa-IR")} قانون از مجموع {" "}
              {data.productRules.total.toLocaleString("fa-IR")} قانون نمایش داده می‌شود.
            </p>
          ) : null}
          <div className={styles.ruleGrid}>
            {data.productRules.items.map((rule) => (
              <article className={styles.ruleCard} key={rule.productId}>
                <header>
                  <strong>{rule.productName}</strong>
                  <span className={styles.statusBadge} data-status={rule.productStatus}>
                    {statusLabels[rule.productStatus] ?? rule.productStatus}
                  </span>
                </header>
                <p className={styles.code}>{rule.productCode}</p>
                <span className={styles.ruleBadge}>
                  {rule.minimumPlanCode ? `حداقل پلن: ${rule.minimumPlanCode}` : "بدون حداقل پلن"}
                </span>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const entitlementColumns: readonly AdminTableColumn<EntitlementRow>[] = [
  {
    key: "id",
    header: "Entitlement ID",
    render: (row) => <code className={styles.identifier}>{row.entitlementId}</code>,
  },
  {
    key: "source",
    header: "منبع",
    render: (row) => <span className={styles.sourceBadge}>{row.source}</span>,
  },
  {
    key: "target",
    header: "نوع هدف",
    render: (row) => (
      <span className={styles.targetBadge}>{targetLabels[row.targetKind] ?? row.targetKind}</span>
    ),
  },
  {
    key: "status",
    header: "وضعیت مؤثر",
    render: (row) => (
      <span className={styles.statusBadge} data-status={row.effectiveStatus}>
        {statusLabels[row.effectiveStatus] ?? row.effectiveStatus}
        {row.storedStatus !== row.effectiveStatus
          ? ` · ذخیره‌شده: ${statusLabels[row.storedStatus] ?? row.storedStatus}`
          : ""}
      </span>
    ),
  },
  { key: "start", header: "شروع", render: (row) => formatDateTime(row.startsAtUtc) },
  { key: "expiry", header: "انقضا", render: (row) => formatDateTime(row.expiresAtUtc) },
];

function EventHistory({ data }: { data: CommerceEntitlementDetail }) {
  return (
    <section className={styles.timelineSection} aria-labelledby="entitlement-events-title">
      <header className={styles.sectionHeader}>
        <div>
          <span>ENTITLEMENT EVENTS</span>
          <h3 id="entitlement-events-title">تاریخچه تغییر دسترسی</h3>
          <p>
            فقط نوع رویداد، Entitlement ID و زمان‌ها نمایش داده می‌شود؛ `metadata_json` و provider event
            key وارد Command Center نمی‌شوند.
          </p>
        </div>
      </header>
      {data.eventHistory.items.length === 0 ? (
        <p className={styles.emptyNote}>رویداد ثبت‌شده‌ای برای این Feature وجود ندارد.</p>
      ) : (
        <>
          {data.eventHistory.total > data.eventHistory.items.length ? (
            <p className={styles.emptyNote}>
              {data.eventHistory.items.length.toLocaleString("fa-IR")} رویداد اخیر از مجموع {" "}
              {data.eventHistory.total.toLocaleString("fa-IR")} رویداد نمایش داده می‌شود.
            </p>
          ) : null}
          <ol className={styles.timeline}>
            {data.eventHistory.items.map((event) => (
              <li key={event.eventId}>
                <span className={styles.timelineMarker} aria-hidden="true" />
                <div className={styles.timelineCard}>
                  <div>
                    <strong>{eventLabels[event.eventType] ?? event.eventType}</strong>
                    <code>{event.entitlementId}</code>
                  </div>
                  <time dateTime={event.occurredAtUtc}>{formatDateTime(event.occurredAtUtc)}</time>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

async function EntitlementContent({ featureCode, page }: { featureCode: string; page: number }) {
  const result = await getCommerceEntitlementDetail(featureCode, detailParams(page));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return <AdminPageState state="error" title="درخواست Entitlement معتبر نیست" />;
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
  const previousHref = data.page > 1 ? pageHref(featureCode, data.page - 1) : undefined;
  const nextHref =
    data.page * data.pageSize < data.entitlements.total
      ? pageHref(featureCode, data.page + 1)
      : undefined;

  return (
    <div className={styles.page}>
      <Hero data={data} />
      <div className={styles.warning}>
        <strong>تعریف «فعال مؤثر»:</strong> status ذخیره‌شده به‌تنهایی کافی نیست؛ زمان شروع و انقضا هم
        اعمال می‌شوند. اگر وضعیت مؤثر با وضعیت ذخیره‌شده فرق کند، هر دو در جدول دیده می‌شوند.
      </div>
      <Summary data={data} />
      <ProductRules data={data} />
      <AdminDataTable
        title="Grantهای Entitlement"
        description="فهرست صفحه‌بندی‌شده بدون account/person ID، source_key، provider event key یا metadata حساس."
        rows={data.entitlements.items}
        columns={entitlementColumns}
        rowKey={(row) => row.entitlementId}
        total={data.entitlements.total}
        freshness={{
          status: data.freshness.status,
          label: formatDateTime(data.freshness.asOfUtc),
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.entitlements.total,
          previousHref,
          nextHref,
          ariaLabel: "صفحه‌بندی Entitlementها",
        }}
      />
      <EventHistory data={data} />
    </div>
  );
}

export default async function EntitlementDetailPage({
  params,
  searchParams,
}: EntitlementDetailPageProps) {
  const admin = await requireAdminAccess();
  const { featureCode } = await params;
  const query = await searchParams;
  const page = pageNumber(first(query.page));
  const canReadCommerce = admin.permissions.includes("commerce.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="جزئیات Entitlement"
        subtitle="Feature rules، grantها و رویدادهای دسترسی واقعی"
      >
        {!canReadCommerce ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت جزئیات Entitlement" />}
          >
            <EntitlementContent featureCode={featureCode} page={page} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
