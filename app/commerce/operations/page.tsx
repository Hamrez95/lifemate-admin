import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getCommercePaymentOperationsSnapshot } from "@/src/lib/admin-api/commerce-payment-operations-v2";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { CommerceWorkspaceHeader, CoreDependencyNotice } from "../CommerceWorkspaceHeader";
import {
  ReconciliationForm,
  RefundRequestForm,
  RenewalIntentForm,
} from "./PaymentOperationsControls";
import styles from "./operations.module.css";

function format(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date(value));
}

export default async function CommerceOperationsPage() {
  const admin = await requireAdminAccess();
  const relevant = [
    "commerce.refund.read",
    "commerce.refund.request",
    "commerce.reconciliation.read",
    "commerce.reconciliation.write",
    "commerce.churn.read",
    "commerce.churn.write",
  ];
  if (!relevant.some((permission) => admin.permissions.includes(permission))) {
    redirect("/forbidden");
  }
  const snapshot = await getCommercePaymentOperationsSnapshot();
  const canRefund = admin.permissions.includes("commerce.refund.request");
  const canReconcile = admin.permissions.includes("commerce.reconciliation.write");
  const canChurn = admin.permissions.includes("commerce.churn.write");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="عملیات مالی و Churn"
        subtitle="Refund، Reconciliation و Renewal Intent از قرارداد canonical Core"
      >
        <main className={styles.page} dir="rtl">
          <CommerceWorkspaceHeader
            active="operations"
            eyebrow="Core #493 · Admin #183"
            title="Payment Operations"
            description="عملیات مالی بدون direct DB edit؛ provider factها append-only می‌مانند و لغو renewal entitlement خریداری‌شده را قبل از پایان دوره حذف نمی‌کند."
          />

          <section className={styles.statusGrid} aria-label="وضعیت قراردادها">
            {Object.entries(snapshot.access).map(([key, state]) => (
              <CoreDependencyNotice
                key={key}
                title={`${key}: ${state}`}
                tone={state === "ready" ? "available" : state === "forbidden" ? "info" : "blocked"}
              >
                {state === "ready"
                  ? "داده از Core canonical دریافت شده است."
                  : state === "forbidden"
                    ? "این role permission لازم برای این بخش را ندارد."
                    : "Core contract یا runtime فعلاً در دسترس نیست؛ داده جایگزین ساخته نمی‌شود."}
              </CoreDependencyNotice>
            ))}
          </section>

          <section className={styles.grid}>
            <article className={styles.panel}>
              <header>
                <div>
                  <p className="eyebrow">Refunds</p>
                  <h3>Refund Requests</h3>
                </div>
                <span>{snapshot.refunds?.length ?? 0}</span>
              </header>
              {snapshot.refunds ? (
                snapshot.refunds.slice(0, 8).map((item) => (
                  <div className={styles.row} key={item.refundRequestId}>
                    <div>
                      <strong>
                        {item.amountMinor} {item.currency}
                      </strong>
                      <small>
                        {item.requestStatus} · {item.providerStatus ?? "provider pending"}
                      </small>
                    </div>
                    <time>{format(item.requestedAtUtc)}</time>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>داده refund برای این session قابل مشاهده نیست.</p>
              )}
              {canRefund ? (
                <RefundRequestForm />
              ) : (
                <p className={styles.muted}>permission: commerce.refund.request لازم است.</p>
              )}
            </article>

            <article className={styles.panel}>
              <header>
                <div>
                  <p className="eyebrow">Reconciliation</p>
                  <h3>Provider mismatch cases</h3>
                </div>
                <span>{snapshot.reconciliationCases?.length ?? 0}</span>
              </header>
              {snapshot.reconciliationCases ? (
                snapshot.reconciliationCases.slice(0, 8).map((item) => (
                  <div className={styles.row} key={item.caseId}>
                    <div>
                      <strong>{item.caseType}</strong>
                      <small>
                        {item.status} · {item.classificationSource ?? item.source}
                      </small>
                    </div>
                    <time>{format(item.openedAtUtc)}</time>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>
                  Reconciliation facts برای این session قابل مشاهده نیست.
                </p>
              )}
              {canReconcile ? (
                <ReconciliationForm />
              ) : (
                <p className={styles.muted}>permission: commerce.reconciliation.write لازم است.</p>
              )}
            </article>

            <article className={styles.panel}>
              <header>
                <div>
                  <p className="eyebrow">Churn</p>
                  <h3>Non-renewal intents</h3>
                </div>
                <span>{snapshot.churn?.length ?? 0}</span>
              </header>
              {snapshot.churn ? (
                snapshot.churn.slice(0, 8).map((item) => (
                  <div className={styles.row} key={item.subscriptionId}>
                    <div>
                      <strong>{item.cancellationReasonCode ?? "reason unavailable"}</strong>
                      <small>
                        {item.status} ·{" "}
                        {item.cancelAtPeriodEnd ? "cancel at period end" : "renewal active"}
                      </small>
                    </div>
                    <time>{format(item.nonRenewalRequestedAtUtc ?? item.currentPeriodEndUtc)}</time>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>Churn facts برای این session قابل مشاهده نیست.</p>
              )}
              {canChurn ? (
                <RenewalIntentForm />
              ) : (
                <p className={styles.muted}>permission: commerce.churn.write لازم است.</p>
              )}
            </article>
          </section>

          <footer className={styles.footer}>
            As of {format(snapshot.asOfUtc)} · {"هیچ revenue/refund/provider fact از UI استنتاج نمی‌شود."}
          </footer>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
