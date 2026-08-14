import { redirect } from "next/navigation";

import { AdminPageState, AdminPagination } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getRelationshipOverview,
  type RelationshipOverviewItem,
  type RelationshipOverviewKind,
} from "@/src/lib/admin-api/relationship-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./relationships.module.css";

type RelationshipsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const kindMeta: Record<
  RelationshipOverviewKind,
  { label: string; short: string; description: string; symbol: string }
> = {
  relationship: {
    label: "Relationship",
    short: "رابطه",
    description: "نسبت انسانی یا خانوادگی؛ به‌تنهایی هیچ مجوز داده‌ای ایجاد نمی‌کند.",
    symbol: "♡",
  },
  consent: {
    label: "Consent",
    short: "رضایت",
    description: "رضایت نسخه‌دار برای یک هدف مشخص؛ مستقل از رابطه و مجوز فنی.",
    symbol: "✓",
  },
  access_grant: {
    label: "Access Grant",
    short: "مجوز دسترسی",
    description: "مجوز scoped و زمان‌دار؛ فقط همین لایه اجازه فنی دسترسی را تعریف می‌کند.",
    symbol: "⌁",
  },
};

const statusLabels: Record<string, string> = {
  Active: "فعال",
  Ended: "پایان‌یافته",
  Revoked: "لغوشده",
  Expired: "منقضی",
  Granted: "اعطاشده",
  Superseded: "جایگزین‌شده",
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function filtersFrom(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of ["page", "pageSize", "kind", "status"] as const) {
    const value = one(input[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function pageHref(filters: URLSearchParams, page: number): string {
  const next = new URLSearchParams(filters);
  next.set("page", String(page));
  return `/relationships?${next.toString()}`;
}

function labelStatus(value: string): string {
  return statusLabels[value] ?? value;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function kindTotal(
  summary: Array<{ kind: RelationshipOverviewKind; status: string; total: number }>,
  kind: RelationshipOverviewKind,
): number {
  return summary
    .filter((item) => item.kind === kind)
    .reduce((total, item) => total + item.total, 0);
}

function itemTitle(item: RelationshipOverviewItem): string {
  if (item.kind === "relationship") return item.type ?? "Relationship";
  if (item.kind === "consent") return item.purpose ?? "Consent";
  return item.context ?? "Access Grant";
}

function itemDetail(item: RelationshipOverviewItem): string {
  if (item.kind === "relationship") {
    return "رابطه انسانی؛ وضعیت دسترسی باید جداگانه از Access Grant بررسی شود.";
  }
  if (item.kind === "consent") {
    return item.context ? `Scope: ${item.context}` : "رضایت ثبت‌شده بدون context نمایشی.";
  }
  if (item.scopeCount !== null) {
    return `${item.scopeCount.toLocaleString("fa-IR")} scope فعال/ثبت‌شده برای این grant`;
  }
  return "مجوز دسترسی scoped";
}

function OverviewItem({ item }: { item: RelationshipOverviewItem }) {
  const meta = kindMeta[item.kind];
  return (
    <article className={styles.activityItem} data-kind={item.kind}>
      <div className={styles.activityIcon} aria-hidden="true">
        {meta.symbol}
      </div>
      <div className={styles.activityBody}>
        <div className={styles.activityTopline}>
          <div>
            <span className={styles.kindLabel}>{meta.short}</span>
            <strong>{itemTitle(item)}</strong>
          </div>
          <span className={styles.statusBadge} data-status={item.status}>
            {labelStatus(item.status)}
          </span>
        </div>
        <p>{itemDetail(item)}</p>
        <div className={styles.activityMeta}>
          <span>ثبت: {formatDateTime(item.occurredAtUtc)}</span>
          <span>شروع: {formatDateTime(item.startedAtUtc)}</span>
          <span>پایان: {formatDateTime(item.endedAtUtc)}</span>
          {item.subjectPersonId ? (
            <code title="شناسه Person موضوع رکورد">{item.subjectPersonId}</code>
          ) : null}
        </div>
      </div>
    </article>
  );
}

async function RelationshipsContent({ filters }: { filters: URLSearchParams }) {
  const result = await getRelationshipOverview(filters);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") {
    return (
      <AdminPageState
        state="error"
        title="فیلتر انتخاب‌شده معتبر نیست"
        description="نوع رکورد، وضعیت و صفحه‌بندی را بررسی کنید."
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

  const data = result.data;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const previousHref = data.page > 1 ? pageHref(filters, data.page - 1) : undefined;
  const nextHref = data.page < totalPages ? pageHref(filters, data.page + 1) : undefined;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Trust Architecture · LifeMate</span>
          <h2>روابط، رضایت و مجوز؛ سه مفهوم مستقل</h2>
          <p>
            این صفحه عمداً این سه لایه را از هم جدا نگه می‌دارد تا وجود یک رابطه خانوادگی یا یک
            رضایت، به اشتباه به معنی دسترسی به داده تلقی نشود.
          </p>
        </div>
        <div className={styles.trustDiagram} aria-label="سه لایه مستقل اعتماد و دسترسی">
          {(Object.keys(kindMeta) as RelationshipOverviewKind[]).map((kind) => (
            <div key={kind} className={styles.diagramNode} data-kind={kind}>
              <span aria-hidden="true">{kindMeta[kind].symbol}</span>
              <strong>{kindMeta[kind].short}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pillarGrid} aria-label="خلاصه سه مفهوم">
        {(Object.keys(kindMeta) as RelationshipOverviewKind[]).map((kind) => {
          const meta = kindMeta[kind];
          return (
            <article className={styles.pillarCard} data-kind={kind} key={kind}>
              <div className={styles.pillarTopline}>
                <span className={styles.pillarIcon} aria-hidden="true">
                  {meta.symbol}
                </span>
                <span className={styles.pillarCount}>
                  {kindTotal(data.summary, kind).toLocaleString("fa-IR")}
                </span>
              </div>
              <h3>{meta.label}</h3>
              <p>{meta.description}</p>
              <div className={styles.pillarStatuses}>
                {data.summary
                  .filter((item) => item.kind === kind)
                  .map((item) => (
                    <span key={`${kind}-${item.status}`}>
                      {labelStatus(item.status)}: {item.total.toLocaleString("fa-IR")}
                    </span>
                  ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.filterCard} aria-labelledby="relationship-filters-title">
        <div>
          <span className={styles.eyebrow}>نمای عملیاتی</span>
          <h3 id="relationship-filters-title">فیلتر رکوردها</h3>
          <p>
            فقط metadata لازم نمایش داده می‌شود؛ نام و اطلاعات تماس طرف‌های رابطه در این overview
            نیست.
          </p>
        </div>
        <form className={styles.filters} method="get">
          <label>
            <span>نوع</span>
            <select name="kind" defaultValue={data.filters.kind ?? ""}>
              <option value="">همه انواع</option>
              <option value="relationship">Relationship</option>
              <option value="consent">Consent</option>
              <option value="access_grant">Access Grant</option>
            </select>
          </label>
          <label>
            <span>وضعیت</span>
            <input
              name="status"
              maxLength={32}
              defaultValue={data.filters.status ?? ""}
              placeholder="مثلاً Active یا Revoked"
            />
          </label>
          <input type="hidden" name="pageSize" value={data.pageSize} />
          <button type="submit">اعمال فیلتر</button>
        </form>
      </section>

      <section className={styles.activityCard} aria-labelledby="relationship-activity-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>آخرین رکوردها</span>
            <h3 id="relationship-activity-title">وضعیت‌های ثبت‌شده</h3>
            <p>
              {data.total.toLocaleString("fa-IR")} رکورد مطابق فیلتر · تازه‌سازی:{" "}
              {formatDateTime(data.freshness.asOfUtc)}
            </p>
          </div>
          <span className={styles.ledgerHint}>Ledger کامل در ADM-REL-002</span>
        </div>

        {data.items.length === 0 ? (
          <AdminPageState state="empty" title="رکوردی با این فیلتر پیدا نشد" />
        ) : (
          <div className={styles.activityList}>
            {data.items.map((item) => (
              <OverviewItem key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        )}

        <AdminPagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          previousHref={previousHref}
          nextHref={nextHref}
          ariaLabel="صفحه‌بندی روابط، رضایت‌ها و مجوزهای دسترسی"
        />
      </section>
    </div>
  );
}

export default async function RelationshipsPage({ searchParams }: RelationshipsPageProps) {
  const admin = await requireAdminAccess();
  const canReadRelationships = admin.permissions.includes("relationships.read");
  const filters = filtersFrom(await searchParams);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="relationships"
        title="روابط و رضایت"
        subtitle="Relationship، Consent و Access Grant با مرزهای مستقل"
      >
        {!canReadRelationships ? (
          <AdminPageState state="forbidden" />
        ) : (
          <RelationshipsContent filters={filters} />
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
