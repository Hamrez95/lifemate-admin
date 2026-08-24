import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AdminPageState, AdminPagination } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import {
  getUserActivity,
  getUserDetail,
  type UserActivityResponse,
  type UserDetailResponse,
  type UserDetailSection,
} from "@/src/lib/admin-api/user-detail";

import { UserActionMenu } from "./UserActionMenu";
import styles from "./user-detail.module.css";
import privacyStyles from "./user-privacy-reference.module.css";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVITY_PAGE_SIZE = 20;

const statusLabels: Record<string, string> = {
  Active: "فعال",
  Disabled: "غیرفعال",
  DeletionPending: "در انتظار حذف",
  Trialing: "آزمایشی",
  PastDue: "سررسید گذشته",
  Cancelled: "لغوشده",
  Expired: "منقضی",
  Suspended: "تعلیق‌شده",
  Pending: "در انتظار",
  Revoked: "لغوشده",
};

const relationshipDirectionLabels = {
  Incoming: "ورودی",
  Outgoing: "خروجی",
};

const tabs = [
  { id: "overview", label: "نمای کلی", hint: "حساب و پروفایل" },
  { id: "products", label: "محصول‌ها", hint: "عضویت و فعالیت" },
  { id: "relationships", label: "روابط", hint: "Relationship / Consent" },
  { id: "commerce", label: "اشتراک", hint: "Plan / Entitlement" },
  { id: "support", label: "پشتیبانی", hint: "Tickets" },
  { id: "activity", label: "Timeline", hint: "فعالیت مدیریتی" },
] as const;

type UserDetailTab = (typeof tabs)[number]["id"];

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type UserDetailPageProps = {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseTab(value: string | undefined): UserDetailTab {
  return tabs.some((tab) => tab.id === value) ? (value as UserDetailTab) : "overview";
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function labelStatus(value: string): string {
  return statusLabels[value] ?? value;
}

function tabHref(accountId: string, tab: UserDetailTab, page?: number): string {
  const search = new URLSearchParams({ tab });
  if (tab === "activity" && page && page > 1) search.set("page", String(page));
  return `/users/${accountId}?${search.toString()}`;
}

function SectionFrame({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`${styles.card} ${wide ? styles.cardWide : ""}`}>
      <header className={styles.cardHeader}>
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function SectionState({
  section,
  forbiddenDescription,
}: {
  section: UserDetailSection<unknown>;
  forbiddenDescription?: string;
}) {
  if (section.state === "forbidden") {
    return (
      <AdminPageState
        state="forbidden"
        title="این بخش برای نقش فعلی قابل مشاهده نیست"
        description={forbiddenDescription}
      />
    );
  }
  if (section.state === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        title="این بخش فعلاً در دسترس نیست"
        description="خطای این منبع، سایر بخش‌های صفحه کاربر را متوقف نکرده است."
      />
    );
  }
  if (section.state === "empty")
    return <AdminPageState state="empty" title="داده‌ای برای این بخش ثبت نشده است" />;
  return null;
}

function AccountCard({ data }: { data: UserDetailResponse }) {
  const account = data.account.data;
  if (!account) return null;

  return (
    <SectionFrame title="حساب" description="هویت مدیریتی پایه؛ بدون اطلاعات تماس یا داده سلامت">
      <dl className={styles.definitionList}>
        <div className={styles.definitionRow}>
          <dt>شناسه حساب</dt>
          <dd>
            <code>{account.id}</code>
          </dd>
        </div>
        <div className={styles.definitionRow}>
          <dt>وضعیت</dt>
          <dd>{labelStatus(account.status)}</dd>
        </div>
        <div className={styles.definitionRow}>
          <dt>تاریخ عضویت</dt>
          <dd>{formatDate(account.createdAtUtc)}</dd>
        </div>
      </dl>
    </SectionFrame>
  );
}

function PersonCard({ data }: { data: UserDetailResponse }) {
  if (data.person.state !== "ready" || !data.person.data) {
    return (
      <SectionFrame title="Person" description="شخص متصل به حساب">
        <SectionState section={data.person} />
      </SectionFrame>
    );
  }

  const person = data.person.data;
  return (
    <SectionFrame title="Person" description="پروفایل پایه و غیرپزشکی">
      <dl className={styles.definitionList}>
        <div className={styles.definitionRow}>
          <dt>نام نمایشی</dt>
          <dd>{person.displayName || "—"}</dd>
        </div>
        <div className={styles.definitionRow}>
          <dt>شناسه شخص</dt>
          <dd>
            <code>{person.id}</code>
          </dd>
        </div>
        <div className={styles.definitionRow}>
          <dt>زبان</dt>
          <dd>{person.locale || "—"}</dd>
        </div>
        <div className={styles.definitionRow}>
          <dt>منطقه زمانی</dt>
          <dd>{person.timeZone || "—"}</dd>
        </div>
      </dl>
    </SectionFrame>
  );
}

function ProductsCard({ data }: { data: UserDetailResponse }) {
  if (data.products.state !== "ready" || !data.products.data) {
    return (
      <SectionFrame title="محصول‌های LifeMate" description="عضویت کاربر در محصولات اکوسیستم" wide>
        <SectionState section={data.products} />
      </SectionFrame>
    );
  }

  return (
    <SectionFrame title="محصول‌های LifeMate" description="عضویت و آخرین فعالیت محصول" wide>
      <ul className={styles.list}>
        {data.products.data.map((product) => (
          <li className={styles.listItem} key={product.applicationCode}>
            <div className={styles.listItemTop}>
              <strong>{product.applicationName}</strong>
              <span className={styles.softBadge}>{labelStatus(product.status)}</span>
            </div>
            <small>
              عضویت: {formatDate(product.enrolledAtUtc)} · آخرین فعالیت:{" "}
              {formatDateTime(product.lastActiveAtUtc)}
            </small>
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

function CommerceCard({ data }: { data: UserDetailResponse }) {
  if (data.commerce.state !== "ready" || !data.commerce.data) {
    return (
      <SectionFrame title="اشتراک و دسترسی" description="فقط با مجوز commerce.read" wide>
        <SectionState
          section={data.commerce}
          forbiddenDescription="برای مشاهده وضعیت اشتراک و entitlement مجوز commerce.read لازم است."
        />
      </SectionFrame>
    );
  }

  return (
    <SectionFrame title="اشتراک و دسترسی" description="Subscription و Entitlement مستقل از هم" wide>
      <div className={styles.split}>
        <div className={styles.subsection}>
          <h4>اشتراک‌ها</h4>
          {data.commerce.data.subscriptions.length === 0 ? (
            <p className={styles.muted}>اشتراکی ثبت نشده است.</p>
          ) : (
            <ul className={styles.list}>
              {data.commerce.data.subscriptions.map((subscription) => (
                <li className={styles.listItem} key={subscription.id}>
                  <div className={styles.listItemTop}>
                    <strong>{subscription.productName}</strong>
                    <span className={styles.softBadge}>{labelStatus(subscription.status)}</span>
                  </div>
                  <small>
                    پلن: {subscription.planName} · پایان دوره:{" "}
                    {formatDate(subscription.currentPeriodEndUtc)}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.subsection}>
          <h4>Entitlementها</h4>
          {data.commerce.data.entitlements.length === 0 ? (
            <p className={styles.muted}>Entitlement فعالی ثبت نشده است.</p>
          ) : (
            <ul className={styles.list}>
              {data.commerce.data.entitlements.map((entitlement) => (
                <li className={styles.listItem} key={entitlement.id}>
                  <div className={styles.listItemTop}>
                    <strong>{entitlement.featureCode}</strong>
                    <span className={styles.softBadge}>{labelStatus(entitlement.status)}</span>
                  </div>
                  <small>انقضا: {formatDate(entitlement.expiresAtUtc)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionFrame>
  );
}

function RelationshipsCard({ data }: { data: UserDetailResponse }) {
  if (data.relationships.state !== "ready" || !data.relationships.data) {
    return (
      <SectionFrame title="روابط" description="خلاصه رابطه؛ بدون افشای هویت طرف مقابل" wide>
        <SectionState
          section={data.relationships}
          forbiddenDescription="برای مشاهده خلاصه روابط مجوز relationships.read لازم است."
        />
      </SectionFrame>
    );
  }

  return (
    <SectionFrame
      title="روابط"
      description="Relationship به‌تنهایی Access Grant ایجاد نمی‌کند"
      wide
    >
      <div>
        {data.relationships.data.map((relationship) => (
          <div
            className={styles.relationshipRow}
            key={`${relationship.direction}-${relationship.relationshipType}-${relationship.status}`}
          >
            <span className={styles.softBadge}>
              {relationshipDirectionLabels[relationship.direction]}
            </span>
            <span>
              {relationship.relationshipType} · {labelStatus(relationship.status)}
            </span>
            <span className={styles.count}>{relationship.count.toLocaleString("fa-IR")}</span>
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}

function OverviewActivityPreview({
  data,
  accountId,
}: {
  data: UserDetailResponse;
  accountId: string;
}) {
  if (data.adminActivity.state !== "ready" || !data.adminActivity.data) return null;

  return (
    <SectionFrame
      title="آخرین فعالیت مدیریتی"
      description="پیش‌نمایش کوتاه؛ Timeline کامل در تب مستقل"
      wide
    >
      <div className={styles.metaRow}>
        <span className={styles.softBadge}>
          مجموع رویدادها: {data.adminActivity.data.total.toLocaleString("fa-IR")}
        </span>
        <Link className={styles.inlineLink} href={tabHref(accountId, "activity")}>
          مشاهده Timeline کامل
        </Link>
      </div>
      <ul className={styles.list}>
        {data.adminActivity.data.latest.slice(0, 3).map((event) => (
          <li className={styles.listItem} key={event.id}>
            <div className={styles.listItemTop}>
              <strong>{event.action}</strong>
              <span className={styles.softBadge}>{event.result}</span>
            </div>
            <small>{formatDateTime(event.occurredAtUtc)}</small>
          </li>
        ))}
      </ul>
    </SectionFrame>
  );
}

function TemporarySensitiveAccessCard() {
  return (
    <SectionFrame
      title="دسترسی موقت به اطلاعات حساس"
      description="کنترل break-glass فقط پس از قرارداد canonical Core"
      wide
    >
      <div className={privacyStyles.sensitiveAccess}>
        <div className={privacyStyles.sensitiveAccessLead}>
          <span className={privacyStyles.sensitiveIcon} aria-hidden="true">
            ⌁
          </span>
          <div>
            <strong>اطلاعات حساس در حالت پیش‌فرض قفل هستند.</strong>
            <p id="temporary-access-unavailable">
              endpoint canonical برای درخواست دسترسی موقت در Core موجود نیست؛ بنابراین این کنترل
              عمداً غیرفعال است و هیچ workaround سمت UI ساخته نمی‌شود.
            </p>
          </div>
        </div>
        <div
          className={privacyStyles.sensitiveRequirements}
          aria-label="پیش‌نیازهای دسترسی موقت حساس"
        >
          <span>AAL2 الزامی</span>
          <span>Permission اختصاصی</span>
          <span>دلیل اجباری</span>
          <span>مدت محدود</span>
          <span>Idempotency</span>
          <span>Audit اجباری</span>
        </div>
        <button type="button" disabled aria-describedby="temporary-access-unavailable">
          درخواست دسترسی موقت
        </button>
      </div>
    </SectionFrame>
  );
}

function TabNavigation({ accountId, activeTab }: { accountId: string; activeTab: UserDetailTab }) {
  return (
    <nav className={styles.tabs} aria-label="بخش‌های جزئیات کاربر">
      {tabs.map((tab) => (
        <Link
          className={styles.tab}
          data-active={tab.id === activeTab ? "true" : "false"}
          aria-current={tab.id === activeTab ? "page" : undefined}
          href={tabHref(accountId, tab.id)}
          key={tab.id}
        >
          <strong>{tab.label}</strong>
          <span>{tab.hint}</span>
        </Link>
      ))}
    </nav>
  );
}

function SupportTab({ canReadSupport }: { canReadSupport: boolean }) {
  return (
    <SectionFrame
      title="پشتیبانی کاربر"
      description="Ticketها در این بخش به User Detail متصل می‌شوند"
      wide
    >
      {canReadSupport ? (
        <AdminPageState
          state="unavailable"
          title="اتصال Ticketها در مرحله بعد فعال می‌شود"
          description="این وضعیت واقعی است و داده ساختگی نمایش داده نمی‌شود. پیاده‌سازی منبع پشتیبانی در ADM-SUP-001 انجام خواهد شد."
        />
      ) : (
        <AdminPageState
          state="forbidden"
          title="مجوز مشاهده پشتیبانی وجود ندارد"
          description="برای مشاهده Ticketهای مرتبط با کاربر، مجوز support.read لازم است."
        />
      )}
    </SectionFrame>
  );
}

function ActivityTimeline({ data }: { data: UserActivityResponse }) {
  if (data.items.length === 0)
    return <AdminPageState state="empty" title="رویداد مدیریتی برای این کاربر ثبت نشده است" />;

  return (
    <ol className={styles.timeline}>
      {data.items.map((event) => (
        <li className={styles.timelineItem} key={event.id}>
          <span className={styles.timelineMarker} aria-hidden="true" />
          <div className={styles.timelineCard}>
            <div className={styles.listItemTop}>
              <strong>{event.action}</strong>
              <span className={styles.softBadge}>{event.result}</span>
            </div>
            <time dateTime={event.occurredAtUtc}>{formatDateTime(event.occurredAtUtc)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}

async function ActivityTab({ accountId, page }: { accountId: string; page: number }) {
  const result = await getUserActivity(accountId, page, ACTIVITY_PAGE_SIZE);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden")
    return (
      <AdminPageState
        state="forbidden"
        title="Timeline مدیریتی برای نقش فعلی قابل مشاهده نیست"
        description="مجوز security.audit.read برای این بخش الزامی است."
      />
    );
  if (result.kind === "unavailable")
    return (
      <AdminPageState
        state="unavailable"
        title="Timeline فعلاً در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );

  const data = result.data;
  const previousHref = data.page > 1 ? tabHref(accountId, "activity", data.page - 1) : undefined;
  const hasNext = data.page * data.pageSize < data.total;
  const nextHref = hasNext ? tabHref(accountId, "activity", data.page + 1) : undefined;

  return (
    <SectionFrame
      title="Timeline مدیریتی"
      description="رویدادهای audit مرتبط با این حساب با صفحه‌بندی سروری"
      wide
    >
      <div className={styles.timelineHeader}>
        <span className={styles.softBadge}>کل رویدادها: {data.total.toLocaleString("fa-IR")}</span>
        <span className={styles.softBadge}>
          آخرین دریافت: {formatDateTime(data.freshness.asOfUtc)}
        </span>
      </div>
      <ActivityTimeline data={data} />
      <AdminPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        previousHref={previousHref}
        nextHref={nextHref}
        ariaLabel="صفحه‌بندی Timeline مدیریتی کاربر"
      />
    </SectionFrame>
  );
}

function LoadingView() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="در حال بارگذاری جزئیات کاربر">
      <AdminPageState state="loading" />
      <div className={styles.grid} aria-hidden="true">
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
      </div>
    </div>
  );
}

function TabLoadingView() {
  return (
    <div className={styles.tabLoading} aria-busy="true" aria-label="در حال بارگذاری Timeline">
      <AdminPageState state="loading" title="در حال دریافت Timeline" />
    </div>
  );
}

function ActiveTabContent({
  data,
  accountId,
  activeTab,
  activityPage,
  canReadSupport,
  canManageUsers,
}: {
  data: UserDetailResponse;
  accountId: string;
  activeTab: UserDetailTab;
  activityPage: number;
  canReadSupport: boolean;
  canManageUsers: boolean;
}) {
  if (activeTab === "products") return <ProductsCard data={data} />;
  if (activeTab === "relationships") return <RelationshipsCard data={data} />;
  if (activeTab === "commerce") return <CommerceCard data={data} />;
  if (activeTab === "support") return <SupportTab canReadSupport={canReadSupport} />;
  if (activeTab === "activity")
    return (
      <Suspense fallback={<TabLoadingView />}>
        <ActivityTab accountId={accountId} page={activityPage} />
      </Suspense>
    );

  return (
    <div className={styles.grid}>
      <AccountCard data={data} />
      <PersonCard data={data} />
      <UserActionMenu
        accountId={accountId}
        accountStatus={data.account.data?.status ?? ""}
        canManage={canManageUsers}
      />
      <OverviewActivityPreview data={data} accountId={accountId} />
      <TemporarySensitiveAccessCard />
    </div>
  );
}

async function UserDetailContent({
  accountId,
  activeTab,
  activityPage,
  canReadSupport,
  canManageUsers,
}: {
  accountId: string;
  activeTab: UserDetailTab;
  activityPage: number;
  canReadSupport: boolean;
  canManageUsers: boolean;
}) {
  const result = await getUserDetail(accountId);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "unavailable")
    return (
      <AdminPageState
        state="unavailable"
        description={
          result.correlationId
            ? `منبع User 360 فعلاً در دسترس نیست. کد پیگیری: ${result.correlationId}`
            : undefined
        }
      />
    );

  const data = result.data;
  const account = data.account.data;
  if (!account) return <AdminPageState state="unavailable" />;
  const displayName = data.person.state === "ready" ? data.person.data?.displayName : null;
  const freshness = formatDateTime(data.freshness.asOfUtc);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`${styles.heroTop} ${privacyStyles.heroTop}`}>
          <div className={styles.identity}>
            <Link className={styles.backLink} href="/users">
              بازگشت به فهرست کاربران
            </Link>
            <span className={styles.eyebrow}>User 360 · Privacy by default</span>
            <h2>{displayName || "کاربر LifeMate"}</h2>
            <code>{account.id}</code>
            <div className={styles.metaRow}>
              <span className={styles.badge} data-status={account.status}>
                {labelStatus(account.status)}
              </span>
              <span className={styles.softBadge}>آخرین دریافت: {freshness}</span>
            </div>
          </div>
          <div className={privacyStyles.heroVisual}>
            <Image
              src="/design-assets/user-privacy-hero-v1.png"
              alt="تصویر حریم خصوصی User 360 در LifeMate"
              width={720}
              height={560}
              sizes="(max-width: 680px) 70vw, 280px"
            />
          </div>
        </div>
      </section>

      <div className={styles.notice}>
        <strong>شما در نمای پشتیبانی پیش‌فرض هستید.</strong>
        <p>
          داده خام سلامت، Women Health، اطلاعات تماس حساس و هر دامنه نیازمند break-glass در این صفحه
          باز نمی‌شود. نبود قرارداد Core به معنی نبود دسترسی است.
        </p>
      </div>

      <TabNavigation accountId={accountId} activeTab={activeTab} />
      <ActiveTabContent
        data={data}
        accountId={accountId}
        activeTab={activeTab}
        activityPage={activityPage}
        canReadSupport={canReadSupport}
        canManageUsers={canManageUsers}
      />
    </div>
  );
}

export default async function UserDetailPage({ params, searchParams }: UserDetailPageProps) {
  const [{ accountId }, query] = await Promise.all([params, searchParams]);
  if (!UUID_PATTERN.test(accountId)) notFound();

  const admin = await requireAdminAccess();
  const canReadUsers = admin.permissions.includes("users.read.basic");
  const canReadSupport = admin.permissions.includes("support.read");
  const canManageUsers = admin.permissions.includes("users.suspend");
  const activeTab = parseTab(first(query.tab));
  const activityPage = parsePositiveInteger(first(query.page), 1);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="users"
        title="User 360"
        subtitle="نمای عملیاتی حداقلی با مرز حریم خصوصی و دسترسی حساس fail-closed"
      >
        {!canReadUsers ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<LoadingView />}>
            <UserDetailContent
              accountId={accountId.toLowerCase()}
              activeTab={activeTab}
              activityPage={activityPage}
              canReadSupport={canReadSupport}
              canManageUsers={canManageUsers}
            />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
