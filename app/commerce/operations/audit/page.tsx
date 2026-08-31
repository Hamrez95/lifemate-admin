import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getCommerceSubscriptionAuditSnapshot } from "@/src/lib/admin-api/commerce-subscription-audit";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import { formatPersianDateTime } from "@/src/lib/time-zone";

import { CommerceWorkspaceHeader, CoreDependencyNotice } from "../../CommerceWorkspaceHeader";
import styles from "../operations.module.css";

function short(value: string | null) {
  if (!value) return "—";
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export default async function CommerceSubscriptionAuditPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("commerce.read")) redirect("/forbidden");
  const snapshot = await getCommerceSubscriptionAuditSnapshot();

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="Conversion / Gift Audit"
        subtitle="ردپای تجاری privacy-minimized بدون داده سلامت یا reproductive-health"
      >
        <main className={styles.page} dir="rtl">
          <CommerceWorkspaceHeader
            active="audit"
            eyebrow="Admin #226 · Commerce read model"
            title="Subscription conversion & gift lifecycle"
            description="فقط provenance تجاری canonical نمایش داده می‌شود؛ این view هیچ Relationship، Consent، Health Permission یا وضعیت Period/Pregnancy را ایجاد یا افشا نمی‌کند."
          />

          <section className={styles.statusGrid} aria-label="وضعیت read modelهای audit">
            <CoreDependencyNotice
              title={`Conversion audit: ${snapshot.access.conversions}`}
              tone={
                snapshot.access.conversions === "ready"
                  ? "available"
                  : snapshot.access.conversions === "forbidden"
                    ? "info"
                    : "blocked"
              }
            >
              source/target subscription، transaction و paid-value provenance بدون اطلاعات سلامت.
            </CoreDependencyNotice>
            <CoreDependencyNotice
              title={`Gift lifecycle: ${snapshot.access.gifts}`}
              tone={
                snapshot.access.gifts === "ready"
                  ? "available"
                  : snapshot.access.gifts === "forbidden"
                    ? "info"
                    : "blocked"
              }
            >
              وضعیت پرداخت/claim و entitlement result؛ raw claim token و claim-token hash نمایش داده
              نمی‌شود.
            </CoreDependencyNotice>
          </section>

          <section className={styles.grid}>
            <article className={styles.panel}>
              <header>
                <div>
                  <p className="eyebrow">Period → CocoonMate</p>
                  <h3>Conversion audit</h3>
                </div>
                <span>{snapshot.conversions?.total ?? 0}</span>
              </header>
              {snapshot.conversions ? (
                snapshot.conversions.items.map((item) => (
                  <div className={styles.row} key={item.conversionId}>
                    <div>
                      <strong>
                        {item.originalPaidMinor} → {item.transferredCreditMinor} {item.currency}
                      </strong>
                      <small>
                        {item.sourceProductCode} → {item.targetProductCode} · TX{" "}
                        {short(item.sourceTransactionId)}
                      </small>
                      <small>
                        Sub {short(item.sourceSubscriptionId)} → {short(item.targetSubscriptionId)}
                      </small>
                    </div>
                    <time>{formatPersianDateTime(item.convertedAtUtc)}</time>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>
                  Conversion read model فعلاً در دسترس نیست؛ داده جایگزین ساخته نمی‌شود.
                </p>
              )}
            </article>

            <article className={styles.panel}>
              <header>
                <div>
                  <p className="eyebrow">Gift Subscription</p>
                  <h3>Gift lifecycle audit</h3>
                </div>
                <span>{snapshot.gifts?.total ?? 0}</span>
              </header>
              {snapshot.gifts ? (
                snapshot.gifts.items.map((item) => (
                  <div className={styles.row} key={item.giftIntentId}>
                    <div>
                      <strong>
                        {item.productCode ?? item.offerCode ?? item.targetKind} · {item.status}
                      </strong>
                      <small>
                        {item.priceAmountMinor ?? "—"} {item.priceCurrency ?? ""} · TX{" "}
                        {short(item.transactionId)}
                      </small>
                      <small>
                        purchaser {short(item.purchaserAccountId)} · recipient{" "}
                        {short(item.recipientAccountId)}
                      </small>
                      <small>
                        entitlement {short(item.resultingSubscriptionId)} · claim expiry{" "}
                        {formatPersianDateTime(item.claimExpiresAtUtc)}
                      </small>
                    </div>
                    <time>
                      {formatPersianDateTime(
                        item.paidAtUtc ?? item.claimedAtUtc ?? item.expiresAtUtc,
                      )}
                    </time>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>
                  Gift lifecycle read model فعلاً در دسترس نیست؛ token یا health data جایگزین
                  نمی‌شود.
                </p>
              )}
            </article>
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
