import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getCommerceCatalogV2 } from "@/src/lib/admin-api/commerce-catalog-v2";
import {
  getEntitlementAdjustmentHistory,
  type ManualEntitlementHistoryItem,
} from "@/src/lib/admin-api/entitlement-adjustments";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import { getUserDetail } from "@/src/lib/admin-api/user-detail";

import {
  AdjustmentForm,
  type ExistingAccessOption,
  type ProductAccessOption,
} from "./AdjustmentForm";
import styles from "./adjustments.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : dateTime.format(parsed);
}

function operationLabel(value: string) {
  switch (value) {
    case "Grant":
      return "اعطا";
    case "Extend":
      return "تمدید";
    case "Reduce":
      return "کاهش";
    case "Revoke":
      return "لغو دسترسی";
    default:
      return value;
  }
}

function HistoryItem({ item }: { item: ManualEntitlementHistoryItem }) {
  return (
    <article className={styles.historyItem}>
      <div>
        <strong>
          {operationLabel(item.operation)} · {item.targetType}
        </strong>
        <p>{item.reason}</p>
        <small>Audit ref: {item.id}</small>
      </div>
      <div className={styles.historyMeta}>
        <span>{formatDate(item.createdAtUtc)}</span>
        <span>{item.scheduleMode}</span>
        <small>{item.affectedEntitlementIds.length.toLocaleString("fa-IR")} entitlement</small>
        {item.approvalRequestId ? <small>Approval-linked</small> : <small>Direct policy path</small>}
      </div>
    </article>
  );
}

export default async function EntitlementAdjustmentsPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  const permissions = new Set(admin.permissions);
  const canRead = permissions.has("commerce.entitlement.adjust.read");
  const canReadCommerce = permissions.has("commerce.read");
  const canRequest = permissions.has("commerce.entitlement.adjust.request");
  const canExecute = permissions.has("commerce.entitlement.adjust.execute");
  if (!canRead && !canRequest && !canExecute) redirect("/forbidden");

  const query = await searchParams;
  const accountId = one(query.accountId).trim().toLowerCase();
  const fromUser360 = one(query.source) === "user360";
  const accountIsValid = !accountId || UUID_PATTERN.test(accountId);

  const [history, userResult, catalogResult] =
    accountId && accountIsValid
      ? await Promise.all([
          canRead ? getEntitlementAdjustmentHistory(accountId, 50) : Promise.resolve(null),
          canReadCommerce ? getUserDetail(accountId) : Promise.resolve(null),
          canReadCommerce ? getCommerceCatalogV2({ includeHidden: true }) : Promise.resolve(null),
        ])
      : [null, null, null];

  if (history?.kind === "unauthenticated" || userResult?.kind === "unauthenticated") {
    redirect("/login");
  }

  const userData = userResult?.kind === "ok" ? userResult.data : null;
  const accountLabel =
    (userData?.person.state === "ready" ? userData.person.data?.displayName : null) ||
    userData?.account.data?.username ||
    "کاربر LifeMate";
  const products: ProductAccessOption[] =
    catalogResult?.kind === "ok"
      ? catalogResult.data.products.map((product) => ({
          id: product.id,
          code: product.code,
          name: product.name,
          status: product.status,
        }))
      : [];
  const entitlements: ExistingAccessOption[] =
    userData?.commerce.state === "ready" && userData.commerce.data
      ? userData.commerce.data.entitlements.map((item) => ({
          id: item.id,
          featureCode: item.featureCode,
          source: item.source,
          status: item.status,
          expiresAtUtc: item.expiresAtUtc,
          version: item.version,
        }))
      : [];
  const workflowReady =
    canReadCommerce &&
    userResult?.kind === "ok" &&
    userData?.commerce.state === "ready" &&
    catalogResult?.kind === "ok";

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="مدیریت دسترسی محصول"
        subtitle="User 360 · Entitlement-only · audited · approval-aware"
      >
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span>Command Center · P0 #252</span>
              <h1>دسترسی واقعی کاربر، بدون خرید یا تراکنش جعلی</h1>
              <p>
                Grant، Extend، Reduce و Revoke فقط Entitlement canonical را تغییر می‌دهند. سوابق
                پرداخت و Subscription واقعی دست‌نخورده می‌مانند و هر تغییر versioned، idempotent و
                audited است.
              </p>
            </div>
            <div className={styles.heroActions}>
              {fromUser360 && accountId ? (
                <Link href={`/users/${accountId}?tab=commerce`}>بازگشت به User 360</Link>
              ) : null}
              <Link href="/commerce">Commerce</Link>
            </div>
          </section>

          <section className={styles.history} aria-labelledby="account-history-title">
            <header>
              <span>User / Account context</span>
              <h2 id="account-history-title">کاربر و تاریخچه تغییر دسترسی</h2>
              <p>
                تصمیم تجاری روی Account/Entitlement است؛ Person، اطلاعات تماس و داده سلامت وارد این
                workflow نمی‌شوند.
              </p>
            </header>

            {fromUser360 && accountId ? (
              <div className={styles.safetyNote}>
                <strong>{accountLabel}</strong>
                <br />
                Account از User 360 انتخاب و برای این workflow قفل شده است.
              </div>
            ) : (
              <form className={styles.lookup} method="get">
                <input
                  name="accountId"
                  defaultValue={accountId}
                  dir="ltr"
                  autoComplete="off"
                  placeholder="Account UUID"
                  aria-label="Account UUID"
                />
                <button type="submit">بارگذاری</button>
              </form>
            )}

            {!accountIsValid ? (
              <AdminPageState
                state="error"
                title="Account ID معتبر نیست"
                description="کاربر را دوباره از User 360 انتخاب کنید."
              />
            ) : null}
            {accountId && !canReadCommerce ? (
              <AdminPageState
                state="forbidden"
                title="مجوز مشاهده وضعیت تجاری کاربر وجود ندارد"
                description="برای تغییر امن دسترسی، commerce.read علاوه بر permission مربوط به adjustment لازم است."
              />
            ) : null}
            {userResult?.kind === "unavailable" ? (
              <AdminPageState
                state="unavailable"
                title="وضعیت Subscription / Entitlement کاربر آماده نیست"
                description="بدون read model canonical هیچ adjustment اجرا نمی‌شود."
              />
            ) : null}
            {catalogResult?.kind === "unavailable" ? (
              <AdminPageState
                state="unavailable"
                title="کاتالوگ محصول در دسترس نیست"
                description="Product ID دستی جایگزین نمی‌شود؛ بعد از بازیابی API دوباره تلاش کنید."
              />
            ) : null}
            {history?.kind === "forbidden" ? (
              <AdminPageState state="forbidden" title="دسترسی تاریخچه رد شد" />
            ) : null}
            {history?.kind === "unavailable" ? (
              <AdminPageState
                state="unavailable"
                title="تاریخچه در دسترس نیست"
                description={history.correlationId ? `کد پیگیری: ${history.correlationId}` : undefined}
              />
            ) : null}
            {history?.kind === "not_found" ? (
              <AdminPageState state="empty" title="Account پیدا نشد" />
            ) : null}
            {history?.kind === "ok" && history.data.items.length === 0 ? (
              <AdminPageState state="empty" title="تغییر دسترسی قبلی برای این کاربر ثبت نشده است" />
            ) : null}
            {history?.kind === "ok" && history.data.items.length > 0 ? (
              <div className={styles.historyList}>
                {history.data.items.map((item) => (
                  <HistoryItem item={item} key={item.id} />
                ))}
              </div>
            ) : null}
          </section>

          {accountId && accountIsValid && (canRequest || canExecute) && workflowReady ? (
            <AdjustmentForm
              accountId={accountId}
              accountLabel={accountLabel}
              requestKey={`entitlement-adjust:${crypto.randomUUID()}`}
              referenceAtUtc={new Date().toISOString()}
              canRequest={canRequest}
              canExecute={canExecute}
              products={products}
              entitlements={entitlements}
            />
          ) : !accountId ? (
            <AdminPageState
              state="empty"
              title="ابتدا کاربر را از User 360 انتخاب کنید"
              description="مسیر پیشنهادی: Users → User 360 → اشتراک → مدیریت دسترسی محصول."
            />
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
