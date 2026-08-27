import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getEntitlementAdjustmentHistory,
  type ManualEntitlementHistoryItem,
} from "@/src/lib/admin-api/entitlement-adjustments";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { AdjustmentForm } from "./AdjustmentForm";
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
        <code>{item.targetId}</code>
        {item.entitlementId ? <code>Entitlement: {item.entitlementId}</code> : null}
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
  const canRequest = permissions.has("commerce.entitlement.adjust.request");
  const canExecute = permissions.has("commerce.entitlement.adjust.execute");
  if (!canRead && !canRequest && !canExecute) redirect("/forbidden");

  const query = await searchParams;
  const accountId = one(query.accountId).trim();
  const accountIsValid = !accountId || UUID_PATTERN.test(accountId);
  const history = accountId && accountIsValid && canRead
    ? await getEntitlementAdjustmentHistory(accountId, 50)
    : null;

  if (history?.kind === "unauthenticated") redirect("/login");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="Manual Entitlement Operations"
        subtitle="Ledger-based · approval-aware · abuse-rule enforced"
      >
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span>Commerce Control Center v2</span>
              <h1>Adjustment بدون دست‌کاری مستقیم دیتابیس</h1>
              <p>
                Grant، Extend، Reduce و Revoke از قرارداد canonical Core عبور می‌کنند. هر تغییر reason،
                idempotency، optimistic version، Abuse decision و Audit دارد.
              </p>
            </div>
            <div className={styles.heroActions}>
              <Link href="/commerce">بازگشت به Commerce</Link>
              <Link href="/commerce/plans">کاتالوگ پلن‌ها</Link>
            </div>
          </section>

          <section className={styles.history} aria-labelledby="account-history-title">
            <header>
              <span>User / Account context</span>
              <h2 id="account-history-title">انتخاب Account و تاریخچه Adjustment</h2>
              <p>
                Billing و entitlement روی Account هستند. این صفحه از Person یا داده سلامت برای تصمیم تجاری استفاده نمی‌کند.
              </p>
            </header>
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

            {!accountIsValid ? (
              <AdminPageState state="error" title="Account ID معتبر نیست" description="یک UUID معتبر وارد کنید." />
            ) : null}
            {accountId && !canRead ? (
              <AdminPageState
                state="forbidden"
                title="مجوز خواندن تاریخچه وجود ندارد"
                description="در صورت داشتن مجوز request/execute همچنان می‌توانید workflow مجاز خود را اجرا کنید."
              />
            ) : null}
            {history?.kind === "forbidden" ? (
              <AdminPageState state="forbidden" title="دسترسی تاریخچه رد شد" />
            ) : null}
            {history?.kind === "unavailable" ? (
              <AdminPageState
                state="error"
                title="تاریخچه در دسترس نیست"
                description={history.correlationId ? `کد پیگیری: ${history.correlationId}` : undefined}
              />
            ) : null}
            {history?.kind === "not_found" ? (
              <AdminPageState state="empty" title="Account پیدا نشد" />
            ) : null}
            {history?.kind === "ok" && history.data.items.length === 0 ? (
              <AdminPageState state="empty" title="Adjustment ثبت‌شده‌ای برای این Account وجود ندارد" />
            ) : null}
            {history?.kind === "ok" && history.data.items.length > 0 ? (
              <div className={styles.historyList}>
                {history.data.items.map((item) => <HistoryItem item={item} key={item.id} />)}
              </div>
            ) : null}
          </section>

          {accountId && accountIsValid && (canRequest || canExecute) ? (
            <AdjustmentForm
              accountId={accountId}
              requestKey={`entitlement-adjust:${crypto.randomUUID()}`}
              referenceAtUtc={new Date().toISOString()}
              canRequest={canRequest}
              canExecute={canExecute}
            />
          ) : !accountId ? (
            <AdminPageState
              state="empty"
              title="ابتدا Account را انتخاب کنید"
              description="برای جلوگیری از adjustment روی subject اشتباه، workflow فقط پس از انتخاب Account فعال می‌شود."
            />
          ) : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
