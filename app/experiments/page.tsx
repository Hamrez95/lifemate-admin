import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  listExperiments,
  listFeedback,
  listFeedbackTrends,
  type ExperimentDefinition,
  type FeedbackItem,
} from "@/src/lib/admin-api/experiments-feedback";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { createExperimentAction, feedbackAction, setExperimentStatusAction } from "./actions";
import styles from "./experiments.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function banner(status: string): string | null {
  if (status === "saved") return "تغییر از مسیر canonical API ثبت شد.";
  if (status === "invalid") return "درخواست با قرارداد فعلی سازگار نبود یا conflict داشت.";
  if (status === "forbidden") return "مجوز لازم برای این عملیات وجود ندارد.";
  if (status === "unavailable") return "API فعلاً در دسترس نیست؛ fallback مستقیم به دیتابیس انجام نشد.";
  return null;
}

function ExperimentCard({ item, canWrite }: { item: ExperimentDefinition; canWrite: boolean }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div><strong>{item.name}</strong><span>{item.key}</span></div>
        <span className={styles.badge}>{item.status}</span>
      </div>
      <dl className={styles.metaGrid}>
        <div><dt>Surface</dt><dd>{item.surface}</dd></div>
        <div><dt>Product</dt><dd>{item.productCode ?? "Global"}</dd></div>
        <div><dt>Primary metric</dt><dd>{item.primaryMetricCode}</dd></div>
        <div><dt>Version</dt><dd>{item.version.toLocaleString("fa-IR")}</dd></div>
      </dl>
      {canWrite ? (
        <form action={setExperimentStatusAction} className={styles.inlineForm}>
          <input type="hidden" name="experimentKey" value={item.key} />
          <input type="hidden" name="expectedVersion" value={item.version} />
          <input type="hidden" name="idempotencyKey" value={`experiment-status-${randomUUID()}`} />
          <select name="nextStatus" defaultValue={item.status === "Draft" ? "Scheduled" : "Paused"}>
            <option value="Scheduled">Scheduled</option><option value="Running">Running</option>
            <option value="Paused">Paused</option><option value="Stopped">Stopped</option><option value="Completed">Completed</option>
          </select>
          <input name="reason" minLength={10} maxLength={1000} required placeholder="دلیل تغییر وضعیت" />
          <button type="submit">ثبت وضعیت</button>
        </form>
      ) : null}
    </article>
  );
}

function FeedbackRow({ item, canWrite }: { item: FeedbackItem; canWrite: boolean }) {
  return (
    <tr>
      <td>{item.kind}</td><td>{item.productCode}</td><td>{item.appVersion ?? "—"}</td>
      <td>{item.npsScore ?? "—"}</td><td>{item.status}</td><td className={styles.messageCell}>{item.message ?? "—"}</td>
      <td>{canWrite ? (
        <form action={feedbackAction} className={styles.feedbackForm}>
          <input type="hidden" name="itemId" value={item.itemId} />
          <input type="hidden" name="expectedStatus" value={item.status} />
          <input type="hidden" name="idempotencyKey" value={`feedback-action-${randomUUID()}`} />
          <select name="feedbackAction" defaultValue={item.status === "Submitted" ? "Acknowledge" : "Triage"}>
            <option value="Acknowledge">Acknowledge</option><option value="Triage">Triage</option><option value="Resolve">Resolve</option>
            <option value="LinkSupport">Link Support</option><option value="LinkProductIssue">Link Product Issue</option>
          </select>
          <input name="reason" minLength={3} maxLength={500} required placeholder="دلیل / یادداشت عملیاتی" />
          <input name="supportTicketId" placeholder="Support ticket UUID (فقط LinkSupport)" />
          <input name="productIssueRef" maxLength={160} placeholder="Opaque issue ref (فقط LinkProductIssue)" />
          <button type="submit">اعمال</button>
        </form>
      ) : "—"}</td>
    </tr>
  );
}

export default async function ExperimentsFeedbackPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  const query = await searchParams;
  const notice = banner(one(query.status));
  const canReadExperiments = admin.permissions.includes("experiments.read");
  const canWriteExperiments = admin.permissions.includes("experiments.write");
  const canReadFeedback = admin.permissions.includes("feedback.read");
  const canReadFeedbackTrends = admin.permissions.includes("feedback.trends.read");
  const canWriteFeedback = admin.permissions.includes("feedback.write");
  if (!canReadExperiments && !canReadFeedback && !canReadFeedbackTrends) {
    return <AdminSessionProvider admin={admin}><AdminShell activeSlug="analytics" title="Experiments & Feedback" subtitle="Product learning control plane"><AdminPageState state="forbidden" title="مجوز Product Signals در دسترس نیست" /></AdminShell></AdminSessionProvider>;
  }

  const experiments = canReadExperiments ? await listExperiments() : null;
  if (experiments?.kind === "unauthenticated") redirect("/login");
  const feedback = canReadFeedback ? await listFeedback({ limit: 50 }) : null;
  if (feedback?.kind === "unauthenticated") redirect("/login");
  const trends = canReadFeedbackTrends ? await listFeedbackTrends({ days: 30 }) : null;
  if (trends?.kind === "unauthenticated") redirect("/login");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell activeSlug="analytics" title="Experiments, Feedback & Advocacy" subtitle="Canonical product learning · no clinical experiments">
        <div className={styles.content}>
          {notice ? <div className={styles.banner}>{notice}</div> : null}
          <section className={styles.hero}>
            <div><span>Product / Growth</span><h2>یادگیری محصول بدون ساخت داده یا دور زدن Consent</h2><p>Experiment فقط روی onboarding/pricing/paywall/CTA/offer/non-clinical UX اجرا می‌شود. Feedback فقط از API canonical خوانده می‌شود.</p></div>
            <div className={styles.rules}><span>Feature Flags are authoritative</span><span>No health-data experiment targeting</span><span>No social scraping</span></div>
          </section>

          {canWriteExperiments ? <section className={styles.panel}>
            <h3>Experiment جدید</h3>
            <form action={createExperimentAction} className={styles.formGrid}>
              <input type="hidden" name="idempotencyKey" value={`experiment-create-${randomUUID()}`} />
              <label><span>Key</span><input name="experimentKey" pattern="[a-z][a-z0-9._-]{2,95}" required /></label>
              <label><span>Name</span><input name="name" minLength={3} maxLength={160} required /></label>
              <label><span>Control key</span><input name="controlKey" pattern="[a-z][a-z0-9._-]{2,95}" required /></label>
              <label><span>Surface</span><select name="surface"><option value="onboarding">onboarding</option><option value="pricing">pricing</option><option value="paywall">paywall</option><option value="cta">cta</option><option value="offer">offer</option><option value="nonclinical_feature">nonclinical_feature</option></select></label>
              <label><span>Product (optional)</span><input name="productCode" /></label>
              <label><span>Segment key (optional)</span><input name="segmentKey" /></label>
              <label><span>Segment snapshot UUID</span><input name="segmentSnapshotId" /></label>
              <label><span>Primary metric</span><input name="primaryMetricCode" required /></label>
              <label><span>Guardrails</span><input name="guardrailMetricCodes" /></label>
              <label className={styles.wide}><span>Variants JSON</span><textarea name="variantsJson" rows={5} required defaultValue={'[{"key":"control","weightBasisPoints":5000,"controlValue":false,"version":1},{"key":"variant","weightBasisPoints":5000,"controlValue":true,"version":1}]'} /></label>
              <label className={styles.wide}><span>Reason</span><textarea name="reason" minLength={10} maxLength={1000} required /></label>
              <button type="submit">ساخت Draft Experiment</button>
            </form>
          </section> : null}

          {canReadExperiments ? <section className={styles.panel}><div className={styles.heading}><h3>Experiments</h3><span>{experiments?.kind === "ok" ? experiments.data.total.toLocaleString("fa-IR") : "—"}</span></div>{experiments?.kind === "ok" ? <div className={styles.cards}>{experiments.data.items.map((item) => <ExperimentCard key={item.key} item={item} canWrite={canWriteExperiments} />)}</div> : <AdminPageState state="unavailable" title="Experiment API در دسترس نیست" description="هیچ Feature Flag یا نتیجه‌ای به‌صورت local جعل نمی‌شود." />}</section> : null}

          {canReadFeedback ? <section className={styles.panel}><div className={styles.heading}><h3>Feedback / NPS / Advocacy</h3><span>{feedback?.kind === "ok" ? feedback.data.total.toLocaleString("fa-IR") : "—"}</span></div>{feedback?.kind === "ok" ? <div className={styles.tableWrap}><table><thead><tr><th>Kind</th><th>Product</th><th>Version</th><th>NPS</th><th>Status</th><th>Message</th><th>Action</th></tr></thead><tbody>{feedback.data.items.map((item) => <FeedbackRow key={item.itemId} item={item} canWrite={canWriteFeedback} />)}</tbody></table></div> : <AdminPageState state="unavailable" title="Feedback Admin API هنوز آماده نیست" description="این بخش تا merge شدن Core #574 fail-closed می‌ماند؛ direct DB fallback وجود ندارد." />}</section> : null}

          {canReadFeedbackTrends ? <section className={styles.panel}><div className={styles.heading}><h3>۳۰ روز اخیر</h3><span>Aggregate only</span></div>{trends?.kind === "ok" ? <div className={styles.trends}>{trends.data.items.slice(0, 24).map((item, index) => <div key={`${item.day}-${item.product_code}-${item.kind}-${item.status}-${index}`}><strong>{String(item.item_count)}</strong><span>{item.day} · {item.product_code} · {item.kind} · {item.status}</span><small>NPS responses: {String(item.nps_response_count)} · avg: {item.average_nps ?? "—"}</small></div>)}</div> : <p className={styles.muted}>Trend فقط از aggregate canonical نمایش داده می‌شود.</p>}<p className={styles.muted}>Advocacy reward execution هنوز تا وجود API canonical reward handoff غیرفعال است؛ review یا view جعلی ساخته نمی‌شود.</p></section> : null}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
