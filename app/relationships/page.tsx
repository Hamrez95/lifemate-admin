import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState, AdminPagination } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getRelationshipOverview,
  type RelationshipOverviewItem,
  type RelationshipOverviewKind,
} from "@/src/lib/admin-api/relationship-overview";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import referenceStyles from "./relationships-reference.module.css";
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
  Pending: "در انتظار",
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

function statusTotal(
  summary: Array<{ kind: RelationshipOverviewKind; status: string; total: number }>,
  kind: RelationshipOverviewKind,
  statuses: string[],
): number {
  const normalized = new Set(statuses.map((status) => status.toLowerCase()));
  return summary
    .filter((item) => item.kind === kind && normalized.has(item.status.toLowerCase()))
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

function SensitiveActions() {
  const actions = [
    { title: "تمدید دسترسی", symbol: "＋" },
    { title: "ویرایش دامنه مجوز", symbol: "✎" },
    { title: "لغو دسترسی", symbol: "⊘" },
  ];

  return (
    <section
      className={referenceStyles.sensitiveActions}
      aria-labelledby="relationship-sensitive-actions-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>Sensitive operations</span>
          <h3 id="relationship-sensitive-actions-title">اقدامات حساس</h3>
          <p>
            Core هنوز mutation canonical این عملیات را ارائه نمی‌کند؛ هیچ مسیر جایگزین یا دسترسی
            مستقیم ساخته نمی‌شود.
          </p>
        </div>
        <span className={referenceStyles.failClosedBadge}>Fail closed</span>
      </div>
      <div className={referenceStyles.actionGrid}>
        {actions.map((action) => (
          <article className={referenceStyles.actionCard} key={action.title}>
            <span className={referenceStyles.actionSymbol} aria-hidden="true">
              {action.symbol}
            </span>
            <div>
              <strong>{action.title}</strong>
              <p>Permission: باید در قرارداد canonical Core تعریف و برای اپراتور احراز شود.</p>
              <p>Confirmation: تأیید صریح و دوباره قبل از اجرای mutation الزامی است.</p>
            </div>
            <button type="button" disabled title="endpoint canonical برای این اقدام وجود ندارد">
              غیرفعال؛ endpoint موجود نیست
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkspaceTabs({ filters }: { filters: URLSearchParams }) {
  const activeKind = filters.get("kind") ?? "";
  const activeStatus = filters.get("status") ?? "";
  const isPending =
    activeKind === "relationship" && activeStatus.toLowerCase() === "pending";

  return (
    <nav className={referenceStyles.tabs} aria-label="بخش‌های روابط و رضایت">
      <Link
        href="/relationships?kind=relationship"
        data-active={activeKind === "relationship" && !isPending ? "true" : "false"}
      >
        روابط
      </Link>
      <Link
        href="/relationships?kind=relationship&status=Pending"
        data-active={isPending ? "true" : "false"}
      >
        درخواست‌ها
      </Link>
      <Link
        href="/relationships?kind=access_grant"
        data-active={activeKind === "access_grant" ? "true" : "false"}
      >
        مجوزهای دسترسی
      </Link>
      <Link
        href="/relationships?kind=consent"
        data-active={activeKind === "consent" ? "true" : "false"}
      >
        رضایت‌ها
      </Link>
      <Link href="/relationships/ledger">تاریخچه و فعالیت‌ها</Link>
    </nav>
  );
}

async function RelationshipsContent({ filters }: { filters: URLSearchParams }) {
  const result = await getRelationshipOverview(filters);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") {
    return (
      <AdminPageState
        state="forbidden"
        title="مجوز مشاهده روابط و رضایت وجود ندارد"
        description="برای این workspace مجوز relationships.read لازم است."
      />
    );
  }
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
        title="منبع canonical روابط و رضایت در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const data = result.data;
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const previousHref = data.page > 1 ? pageHref(filters, data.page - 1) : undefined;
  const nextHref = data.page < totalPages ? pageHref(filters, data.page + 1) : undefined;
  const activeRelationships = statusTotal(data.summary, "relationship", ["Active"]);
  const pendingRequests = statusTotal(data.summary, "relationship", ["Pending"]);
  const activeGrants = statusTotal(data.summary, "access_grant", ["Active", "Granted"]);
  const revokedRecords = statusTotal(data.summary, "consent", ["Revoked"]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Relationships · Access · Consent</span>
          <h2>روابط، دسترسی و رضایت</h2>
          <p>
            مدیریت رابطه، رضایت و مجوزهای دسترسی با مرزهای مستقل. Relationship هیچ‌وقت به‌تنهایی
            مجوز مشاهده اطلاعات سلامت ایجاد نمی‌کند.
          </p>
          <div className={referenceStyles.heroChips}>
            <span>Canonical API only</span>
            <span>relationships.read</span>
            <span>حداقل‌سازی داده</span>
          </div>
        </div>
        <div className={referenceStyles.heroVisual}>
          <Image
            src="/design-assets/relationships-consent-hero-v1.png"
            alt="تصویر روابط، دسترسی و رضایت LifeMate"
            width={720}
            height={560}
            sizes="(max-width: 720px) 76vw, 320px"
            priority
          />
        </div>
      </section>

      <section className={referenceStyles.policyGrid} aria-label="مرزهای رضایت و دسترسی">
        <article data-tone="green">
          <span className={referenceStyles.policyIcon} aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>مجوز مشاهده اطلاعات سلامت</strong>
            <p>هرگونه مشاهده داده سلامت نیازمند رضایت صریح و Access Grant معتبر در Core است.</p>
          </div>
        </article>
        <article data-tone="blue">
          <span className={referenceStyles.policyIcon} aria-hidden="true">
            ○
          </span>
          <div>
            <strong>اشتراک تجاری ≠ دسترسی به اطلاعات سلامت</strong>
            <p>Subscription فقط قابلیت تجاری می‌دهد و هیچ مجوز پزشکی یا رضایت ایجاد نمی‌کند.</p>
          </div>
        </article>
      </section>

      <WorkspaceTabs filters={filters} />

      <div className={referenceStyles.workspaceGrid}>
        <main className={referenceStyles.workspaceMain}>
          <section className={styles.filterCard} aria-labelledby="relationship-filters-title">
            <div>
              <span className={styles.eyebrow}>نمای عملیاتی</span>
              <h3 id="relationship-filters-title">فیلتر رکوردهای canonical</h3>
              <p>
                فقط metadata لازم نمایش داده می‌شود؛ داده پزشکی خام یا اطلاعات تماس حساس در این نما
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
                <span className={styles.eyebrow}>Canonical records</span>
                <h3 id="relationship-activity-title">روابط، درخواست‌ها و وضعیت رضایت</h3>
                <p>
                  {data.total.toLocaleString("fa-IR")} رکورد مطابق فیلتر · تازه‌سازی:{" "}
                  {formatDateTime(data.freshness.asOfUtc)}
                </p>
              </div>
              <Link className={styles.ledgerHint} href="/relationships/ledger">
                مشاهده Ledger کامل
              </Link>
            </div>

            {data.items.length === 0 ? (
              <div className={referenceStyles.emptyState}>
                <Image
                  src="/design-assets/relationships-consent-hero-v1.png"
                  alt=""
                  width={360}
                  height={280}
                  sizes="180px"
                />
                <AdminPageState
                  state="empty"
                  title="رکوردی با این فیلتر پیدا نشد"
                  description="برای گسترش نتیجه، سطح دسترسی یا دامنه داده افزایش داده نمی‌شود."
                />
              </div>
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

          <SensitiveActions />
        </main>

        <aside className={referenceStyles.summaryRail} aria-label="خلاصه وضعیت روابط و رضایت">
          <section className={referenceStyles.summaryCard}>
            <span className={styles.eyebrow}>خلاصه وضعیت</span>
            <h3>روابط و دسترسی</h3>
            <div className={referenceStyles.metricGrid}>
              <div data-tone="green">
                <span>روابط فعال</span>
                <strong>{activeRelationships.toLocaleString("fa-IR")}</strong>
              </div>
              <div data-tone="orange">
                <span>درخواست‌های در انتظار</span>
                <strong>{pendingRequests.toLocaleString("fa-IR")}</strong>
              </div>
              <div data-tone="blue">
                <span>مجوزهای فعال</span>
                <strong>{activeGrants.toLocaleString("fa-IR")}</strong>
              </div>
              <div data-tone="red">
                <span>رضایت‌های لغوشده</span>
                <strong>{revokedRecords.toLocaleString("fa-IR")}</strong>
              </div>
            </div>
          </section>

          <section className={referenceStyles.summaryCard}>
            <span className={styles.eyebrow}>سه لایه مستقل</span>
            {(Object.keys(kindMeta) as RelationshipOverviewKind[]).map((kind) => {
              const meta = kindMeta[kind];
              return (
                <div className={referenceStyles.summaryRow} key={kind}>
                  <span>{meta.symbol}</span>
                  <div>
                    <strong>{meta.short}</strong>
                    <small>{meta.description}</small>
                  </div>
                  <b>{kindTotal(data.summary, kind).toLocaleString("fa-IR")}</b>
                </div>
              );
            })}
          </section>
        </aside>
      </div>
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
        title="روابط، دسترسی و رضایت"
        subtitle="Relationship، Consent و Access Grant با داده canonical و مرزهای روشن حریم خصوصی"
      >
        {!canReadRelationships ? (
          <AdminPageState
            state="forbidden"
            title="مجوز ورود به روابط و رضایت وجود ندارد"
            description="برای مشاهده این workspace مجوز relationships.read لازم است."
          />
        ) : (
          <Suspense
            fallback={
              <AdminPageState
                state="loading"
                title="در حال دریافت روابط و وضعیت رضایت"
                description="داده فقط از API canonical بارگذاری می‌شود."
              />
            }
          >
            <RelationshipsContent filters={filters} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
