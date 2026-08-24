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
  getCommercePromotions,
  promotionStatuses,
  type CommercePromotionRow,
  type CommercePromotionsResponse,
  type PromotionStatus,
} from "@/src/lib/admin-api/commerce-promotions";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  CommerceDependencyGrid,
  CommerceWorkspaceHeader,
  CoreDependencyNotice,
} from "../CommerceWorkspaceHeader";
import { PromotionCreateForm } from "./PromotionCreateForm";
import styles from "./promotions.module.css";

type PromotionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PromotionsQuery = {
  page: number;
  pageSize: number;
  product: string;
  status: string;
  q: string;
  code: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabels: Record<PromotionStatus, string> = {
  Draft: "پیش‌نویس",
  Active: "فعال",
  Paused: "متوقف",
  Expired: "منقضی",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function bounded(value: string, fallback: number, max: number): number {
  if (!/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
}

function safeCode(value: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(value) ? value : "";
}

function exactDiscountCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9._-]{2,63}$/.test(normalized) ? normalized : "";
}

function parseQuery(input: Record<string, string | string[] | undefined>): PromotionsQuery {
  const size = bounded(one(input.pageSize), 25, 100);
  const status = one(input.status).trim();
  return {
    page: bounded(one(input.page), 1, 100_000),
    pageSize: [25, 50, 100].includes(size) ? size : 25,
    product: safeCode(one(input.product).trim()),
    status: promotionStatuses.includes(status as PromotionStatus) ? status : "",
    q: one(input.q).trim().slice(0, 80),
    code: exactDiscountCode(one(input.code)),
  };
}

function apiParams(query: PromotionsQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.product) params.set("product", query.product);
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.code) params.set("code", query.code);
  return params;
}

function pageHref(query: PromotionsQuery, page: number): string {
  const params = apiParams({ ...query, page: Math.max(1, page) });
  return `/commerce/promotions?${params.toString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function formatDiscount(row: CommercePromotionRow): string {
  if (row.discount.type === "Percentage") {
    return row.discount.percentageBasisPoints == null
      ? "—"
      : `${(row.discount.percentageBasisPoints / 100).toLocaleString("fa-IR")}٪`;
  }
  if (!row.discount.fixedAmountMinor || !row.discount.currency) return "—";
  try {
    return `${BigInt(row.discount.fixedAmountMinor).toLocaleString("fa-IR")} ${row.discount.currency}`;
  } catch {
    return "—";
  }
}

function Summary({ data }: { data: CommercePromotionsResponse }) {
  const cards = [
    ["کل", data.summary.total, "neutral"],
    ["Draft", data.summary.draft, "violet"],
    ["فعال", data.summary.active, "green"],
    ["متوقف", data.summary.paused, "orange"],
    ["منقضی", data.summary.expired, "blue"],
  ] as const;
  return (
    <section className={styles.summaryGrid} aria-label="خلاصه پروموشن‌ها">
      {cards.map(([label, value, tone]) => (
        <article key={label} className={styles.summaryCard} data-tone={tone}>
          <span>{label}</span>
          <strong>{value.toLocaleString("fa-IR")}</strong>
          <small>در فیلتر فعلی</small>
        </article>
      ))}
    </section>
  );
}

function Filters({ query, data }: { query: PromotionsQuery; data: CommercePromotionsResponse }) {
  return (
    <AdminTableFilterBar
      action="/commerce/promotions"
      clearHref="/commerce/promotions"
      ariaLabel="فیلتر پروموشن‌ها"
    >
      <input type="hidden" name="page" value="1" />
      <div className="admin-list-filter admin-list-filter--wide">
        <label htmlFor="promotion-search">نام پروموشن</label>
        <input id="promotion-search" name="q" type="search" maxLength={80} defaultValue={query.q} />
      </div>
      <div className="admin-list-filter">
        <label htmlFor="promotion-product">محصول</label>
        <select id="promotion-product" name="product" defaultValue={query.product}>
          <option value="">همه محصولات</option>
          {data.products.map((product) => (
            <option key={product.id} value={product.code}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter">
        <label htmlFor="promotion-status">وضعیت</label>
        <select id="promotion-status" name="status" defaultValue={query.status}>
          <option value="">همه وضعیت‌ها</option>
          {promotionStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list-filter admin-list-filter--wide">
        <label htmlFor="promotion-code">کد دقیق</label>
        <input
          id="promotion-code"
          name="code"
          type="search"
          dir="ltr"
          placeholder="WELCOME-20"
          defaultValue={query.code}
        />
        <small>فقط lookup کد canonical؛ جست‌وجوی جزئی یا تولید کد جدید اینجا انجام نمی‌شود.</small>
      </div>
      <div className="admin-list-filter admin-list-filter--compact">
        <label htmlFor="promotion-page-size">تعداد در صفحه</label>
        <select id="promotion-page-size" name="pageSize" defaultValue={String(query.pageSize)}>
          <option value="25">۲۵</option>
          <option value="50">۵۰</option>
          <option value="100">۱۰۰</option>
        </select>
      </div>
    </AdminTableFilterBar>
  );
}

const columns: readonly AdminTableColumn<CommercePromotionRow>[] = [
  {
    key: "status",
    header: "وضعیت",
    render: (row) => (
      <span className={styles.statusBadge} data-status={row.effectiveStatus}>
        {statusLabels[row.effectiveStatus]}
      </span>
    ),
  },
  {
    key: "name",
    header: "پروموشن",
    render: (row) => (
      <div className={styles.nameCell}>
        <strong>{row.name}</strong>
        <small>{row.product?.name ?? "همه محصولات"}</small>
      </div>
    ),
  },
  { key: "discount", header: "تخفیف", render: (row) => <strong>{formatDiscount(row)}</strong> },
  {
    key: "code",
    header: "کد canonical",
    render: (row) => (
      <div className={styles.codeCell}>
        <code dir="ltr">{row.primaryCodeMasked ?? "—"}</code>
        <small>{row.codeCount.toLocaleString("fa-IR")} کد ثبت‌شده</small>
      </div>
    ),
  },
  {
    key: "window",
    header: "اعتبار",
    render: (row) => (
      <div className={styles.windowCell}>
        <time dateTime={row.startsAtUtc}>{formatDateTime(row.startsAtUtc)}</time>
        <small>تا {formatDateTime(row.endsAtUtc)}</small>
      </div>
    ),
  },
  {
    key: "redemption",
    header: "استفاده",
    render: (row) => (
      <span className={styles.unavailableBadge} title={row.redemptionSummary.reason}>
        — · منبع آماده نیست
      </span>
    ),
  },
  {
    key: "detail",
    header: "جزئیات",
    render: (row) => (
      <Link className={styles.detailLink} href={`/commerce/promotions/${row.promotionId}`}>
        مدیریت
      </Link>
    ),
  },
];

async function PromotionsContent({
  query,
  canWrite,
}: {
  query: PromotionsQuery;
  canWrite: boolean;
}) {
  const result = await getCommercePromotions(apiParams(query));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState state="error" title="فیلتر پروموشن معتبر نیست" description={result.message} />
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
  if (result.kind === "not_found") return <AdminPageState state="empty" />;

  const { data } = result;
  const previousHref = data.page > 1 ? pageHref(query, data.page - 1) : undefined;
  const nextHref =
    data.page * data.pageSize < data.total ? pageHref(query, data.page + 1) : undefined;

  return (
    <div className={styles.page} dir="rtl">
      <CommerceWorkspaceHeader
        active="promotions"
        eyebrow="Commerce · Reference 10"
        title="قوانین تخفیف و پروموشن، فقط از قرارداد واقعی Core"
        description="Promotion یک قانون تجاری canonical است. فهرست، مقدار تخفیف، بازه اعتبار و کد mask‌شده فقط از Admin API نمایش داده می‌شوند؛ تولید یا ویرایش کدهای مستقل تا آماده‌شدن Core #412 فعال نمی‌شود."
      />
      <div className={styles.sourceStrip} data-stale={data.freshness.status === "stale"}>
        <span>{data.source.label}</span>
        <span>Snapshot: {formatDateTime(data.freshness.asOfUtc)}</span>
        <span>{data.freshness.status === "stale" ? "هشدار: داده قدیمی است" : "داده تازه"}</span>
      </div>
      <Summary data={data} />
      <CommerceDependencyGrid>
        <CoreDependencyNotice title="Promotion rule mutation" tone="available">
          ساخت و lifecycle خود Promotion endpoint canonical دارد؛ فقط با commerce.promo.write، reason، Idempotency-Key و Audit فعال است.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Discount-code issuance · Core #412">
          تولید تک‌کد، bulk، usage cap و activation/deactivation مستقل هنوز قرارداد کامل Core ندارد؛ هیچ generator یا edit form جداگانه فعال نیست.
        </CoreDependencyNotice>
        <CoreDependencyNotice title="Redemption analytics" tone="info">
          تا زمانی که منبع canonical redemption آماده نباشد، عملکرد کدها به‌صورت unavailable نمایش داده می‌شود و ROI ساختگی تولید نمی‌شود.
        </CoreDependencyNotice>
      </CommerceDependencyGrid>
      <PromotionCreateForm products={data.products} canWrite={canWrite} />
      <Filters query={query} data={data} />
      <AdminDataTable
        title="پروموشن‌ها"
        description="کدها فقط طبق payload Core به‌صورت mask شده نمایش داده می‌شوند. هیچ کد، تخفیف یا آمار استفاده از روی داده‌های محلی ساخته نمی‌شود."
        rows={data.items}
        columns={columns}
        rowKey={(row) => row.promotionId}
        total={data.total}
        freshness={{
          status: data.freshness.status,
          label: `آخرین دریافت: ${formatDateTime(data.freshness.asOfUtc)}`,
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          previousHref,
          nextHref,
        }}
      />
    </div>
  );
}

export default async function CommercePromotionsPage({ searchParams }: PromotionsPageProps) {
  const admin = await requireAdminAccess();
  const query = parseQuery(await searchParams);
  const canRead = admin.permissions.includes("commerce.read");
  const canWrite = admin.permissions.includes("commerce.promo.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="پروموشن و کد تخفیف"
        subtitle="قوانین تجاری قابل ممیزی LifeMate"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت پروموشن‌ها" />}>
            <PromotionsContent query={query} canWrite={canWrite} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
