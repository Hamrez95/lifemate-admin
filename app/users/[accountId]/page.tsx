import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import {
  getUserDetail,
  type UserDetailResponse,
  type UserDetailSection,
} from "@/src/lib/admin-api/user-detail";

import styles from "./user-detail.module.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
};

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
        description="خطای این منبع، سایر بخش‌های User 360 را متوقف نکرده است."
      />
    );
  }
  if (section.state === "empty") {
    return <AdminPageState state="empty" title="داده‌ای برای این بخش ثبت نشده است" />;
  }
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
              عضویت: {formatDate(product.enrolledAtUtc)} · آخرین فعالیت: {formatDateTime(product.lastActiveAtUtc)}
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
      <SectionFrame title="اشتراک و دسترسی" description="فقط با مجوز commerce.read">
        <SectionState
          section={data.commerce}
          forbiddenDescription="برای مشاهده وضعیت اشتراک و entitlement مجوز commerce.read لازم است."
        />
      </SectionFrame>
    );
  }

  return (
    <SectionFrame title="اشتراک و دسترسی" description="اشتراک‌ها و entitlementهای غیرپرداختی">
      <div className={styles.split}>
        <div className={styles.subsection}>
          <h4>اشتراک‌ها</h4>
          {data.commerce.data.subscriptions.length === 0 ? (
            <p className={styles.muted}>اشتراک فعالی ثبت نشده است.</p>
          ) : (
            <ul className={styles.list}>
              {data.commerce.data.subscriptions.map((subscription) => (
                <li className={styles.listItem} key={subscription.id}>
                  <div className={styles.listItemTop}>
                    <strong>{subscription.productName}</strong>
                    <span className={styles.softBadge}>{labelStatus(subscription.status)}</span>
                  </div>
                  <small>
                    پلن: {subscription.planName} · پایان دوره: {formatDate(subscription.currentPeriodEndUtc)}
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
      <SectionFrame title="روابط" description="خلاصه رابطه؛ بدون افشای هویت طرف مقابل">
        <SectionState
          section={data.relationships}
          forbiddenDescription="برای مشاهده خلاصه روابط مجوز relationships.read لازم است."
        />
      </SectionFrame>
    );
  }

  return (
    <SectionFrame title="روابط" description="Relationship به‌تنهایی Access Grant ایجاد نمی‌کند">
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

function AdminActivityCard({ data }: { data: UserDetailResponse }) {
  if (data.adminActivity.state !== "ready" || !data.adminActivity.data) {
    return (
      <SectionFrame title="فعالیت مدیریتی" description="خلاصه audit مرتبط با این حساب" wide>
        <SectionState
          section={data.adminActivity}
          forbiddenDescription="برای مشاهده خلاصه فعالیت مدیریتی مجوز security.audit.read لازم است."
        />
      </SectionFrame>
    );
  }

  return (
    <SectionFrame title="فعالیت مدیریتی" description="آخرین رویدادهای audit مرتبط با این حساب" wide>
      <div className={styles.metaRow}>
        <span className={styles.softBadge}>
          مجموع رویدادها: {data.adminActivity.data.total.toLocaleString("fa-IR")}
        </span>
      </div>
      <ul className={styles.list}>
        {data.adminActivity.data.latest.map((event) => (
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

function LoadingView() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="در حال بارگذاری User 360">
      <AdminPageState state="loading" />
      <div className={styles.grid} aria-hidden="true">
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
        <div className={styles.loadingCard} />
      </div>
    </div>
  );
}

async function UserDetailContent({ accountId }: { accountId: string }) {
  const result = await getUserDetail(accountId);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "unavailable") {
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
  }

  const data = result.data;
  const account = data.account.data;
  if (!account) return <AdminPageState state="unavailable" />;
  const displayName = data.person.state === "ready" ? data.person.data?.displayName : null;
  const freshness = formatDateTime(data.freshness.asOfUtc);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.identity}>
            <Link className={styles.backLink} href="/users">
              بازگشت به فهرست کاربران
            </Link>
            <h2>{displayName || "کاربر LifeMate"}</h2>
            <code>{account.id}</code>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.badge} data-status={account.status}>
              {labelStatus(account.status)}
            </span>
            <span className={styles.softBadge}>آخرین دریافت: {freshness}</span>
          </div>
        </div>
      </section>

      <div className={styles.notice}>
        <strong>مرز حریم خصوصی</strong>
        <p>
          این صفحه عمداً داده خام سلامت و Women Health را نمایش نمی‌دهد. دسترسی حساس فقط از مسیر مستقل و کنترل‌شده break-glass قابل تعریف خواهد بود.
        </p>
      </div>

      <div className={styles.grid}>
        <AccountCard data={data} />
        <PersonCard data={data} />
        <ProductsCard data={data} />
        <CommerceCard data={data} />
        <RelationshipsCard data={data} />
        <AdminActivityCard data={data} />
      </div>
    </div>
  );
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { accountId } = await params;
  if (!UUID_PATTERN.test(accountId)) notFound();

  const admin = await requireAdminAccess();
  const canReadUsers = admin.permissions.includes("users.read.basic");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="users"
        title="User 360"
        subtitle="نمای یکپارچه و حداقلی حساب، Person، محصولات، اشتراک و روابط"
      >
        {!canReadUsers ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<LoadingView />}>
            <UserDetailContent accountId={accountId.toLowerCase()} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
