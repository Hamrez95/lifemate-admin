import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCampaignExecutions,
  type CampaignExecution,
} from "@/src/lib/admin-api/campaign-executions";
import { getMarketingCampaignDetail } from "@/src/lib/admin-api/marketing-campaign-detail";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  cancelCampaignExecutionAction,
  confirmCampaignExecutionAction,
  prepareCampaignExecutionAction,
  scheduleCampaignExecutionAction,
} from "./actions";
import styles from "./executions.module.css";

type Props = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const number = new Intl.NumberFormat("fa-IR");
const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function when(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : date.format(parsed);
}

function stateAllowsMutation(status: CampaignExecution["status"]): boolean {
  return status === "Prepared" || status === "Confirmed" || status === "Scheduled";
}

function ExecutionCard({
  campaignId,
  execution,
}: {
  campaignId: string;
  execution: CampaignExecution;
}) {
  const canMutate = stateAllowsMutation(execution.status);
  const canConfirm = execution.status === "Prepared" && !execution.confirmed;
  const canSchedule = execution.status === "Prepared" || execution.status === "Confirmed";
  return (
    <article className={styles.execution}>
      <span className={styles.eyebrow}>Execution · v{number.format(execution.version)}</span>
      <h3>
        {execution.status} · {execution.id.slice(0, 8)}…
      </h3>
      <div className={styles.meta}>
        <span>Snapshot: {execution.audienceSnapshotId.slice(0, 8)}…</span>
        <span>Prepared: {when(execution.createdAtUtc)}</span>
        <span>Scheduled: {when(execution.scheduledAtUtc)}</span>
        <span>Second confirmation: {execution.confirmed ? "ثبت شده" : "ثبت نشده"}</span>
      </div>
      <div className={styles.grid}>
        <div className={styles.metric}>
          <span>Audience</span>
          <strong>{number.format(execution.audienceCount)}</strong>
        </div>
        <div className={styles.metric}>
          <span>Eligible SMS</span>
          <strong>{number.format(execution.eligibleSmsCount)}</strong>
        </div>
        <div className={styles.metric}>
          <span>Eligible Push</span>
          <strong>{number.format(execution.eligiblePushCount)}</strong>
        </div>
        <div className={styles.metric}>
          <span>Opt-out</span>
          <strong>
            SMS {number.format(execution.optedOutSmsCount)} · Push{" "}
            {number.format(execution.optedOutPushCount)}
          </strong>
        </div>
      </div>
      <p>
        {execution.estimatedSmsCostMinor === null
          ? "هزینه SMS برای این execution ثبت نشده است."
          : `Estimated SMS cost: ${execution.estimatedSmsCostMinor} ${execution.estimatedSmsCostCurrency ?? ""} · provider ${execution.smsProvider ?? "unknown"}`}
      </p>
      {canMutate ? (
        <div className={styles.actions}>
          {canConfirm ? (
            <form action={confirmCampaignExecutionAction} className={styles.actionForm}>
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="executionId" value={execution.id} />
              <input type="hidden" name="expectedVersion" value={execution.version} />
              <button type="submit">Confirm send</button>
            </form>
          ) : null}
          {canSchedule ? (
            <form action={scheduleCampaignExecutionAction} className={styles.actionForm}>
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="executionId" value={execution.id} />
              <input type="hidden" name="expectedVersion" value={execution.version} />
              <label>
                <span>Schedule</span>
                <input type="datetime-local" name="scheduledAtUtc" required />
              </label>
              <button type="submit">Schedule</button>
            </form>
          ) : null}
          <form
            action={cancelCampaignExecutionAction}
            className={`${styles.actionForm} ${styles.cancel}`}
          >
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="executionId" value={execution.id} />
            <input type="hidden" name="expectedVersion" value={execution.version} />
            <label>
              <span>دلیل لغو</span>
              <input name="reason" minLength={10} maxLength={1000} required />
            </label>
            <button type="submit">Cancel</button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export default async function CampaignExecutionsPage({ params, searchParams }: Props) {
  const admin = await requireAdminAccess();
  const { campaignId } = await params;
  const query = await searchParams;
  const canSend = admin.permissions.includes("marketing.campaign.send");
  const [detail, executions] = canSend
    ? await Promise.all([getMarketingCampaignDetail(campaignId), getCampaignExecutions(campaignId)])
    : [null, null];
  if (detail?.kind === "unauthenticated" || executions?.kind === "unauthenticated")
    redirect("/login");
  const notice = one(query.notice);
  const message = one(query.message);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Campaign Execution"
        subtitle="Prepare → verify audience/opt-out/cost → confirm → schedule/cancel"
      >
        <div className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>High-risk delivery workflow</span>
              <h2>{detail?.kind === "ok" ? detail.data.campaign.name : "Campaign Execution"}</h2>
              <p>
                این workspace فقط از Snapshot immutable و read model canonical Core استفاده می‌کند؛
                recipient identifier و message body در execution history نمایش داده نمی‌شوند.
              </p>
            </div>
            <Link href={`/marketing/campaigns/${campaignId}`}>بازگشت به Campaign</Link>
          </header>

          {notice && message ? (
            <div
              className={styles.notice}
              data-kind={notice}
              role={notice === "error" ? "alert" : "status"}
            >
              {message}
            </div>
          ) : null}

          {!canSend || detail?.kind === "forbidden" || executions?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : detail?.kind !== "ok" || executions?.kind !== "ok" ? (
            <AdminPageState state="unavailable" />
          ) : (
            <>
              <section className={styles.privacy}>
                <strong>Privacy boundary verified by API response</strong>
                <p>
                  recipientIdentifiersExposed=false · messageBodiesExposed=false · freshness{" "}
                  {when(executions.data.freshness.asOfUtc)}
                </p>
              </section>

              <section className={styles.panel}>
                <span className={styles.eyebrow}>Prepare execution</span>
                <h3>Snapshot را به نسخه دقیق Campaign قفل کن</h3>
                <p>
                  اگر Campaign بعد از این timestamp تغییر کند، Core prepare را fail-closed می‌کند.
                  SMS pricing فقط زمانی پذیرفته می‌شود که SMS واقعاً انتخاب شده باشد.
                </p>
                <form action={prepareCampaignExecutionAction} className={styles.form}>
                  <input type="hidden" name="campaignId" value={campaignId} />
                  <input
                    type="hidden"
                    name="campaignUpdatedAtUtc"
                    value={detail.data.campaign.updatedAtUtc}
                  />
                  <label className={styles.full}>
                    <span>Audience Snapshot UUID</span>
                    <input name="audienceSnapshotId" required pattern="[0-9a-fA-F-]{36}" />
                  </label>
                  <div className={`${styles.channels} ${styles.full}`}>
                    <label>
                      <input type="checkbox" name="channelSms" /> SMS
                    </label>
                    <label>
                      <input type="checkbox" name="channelPush" /> Push
                    </label>
                  </div>
                  <label>
                    <span>SMS provider</span>
                    <input name="smsProvider" placeholder="kavenegar" />
                  </label>
                  <label>
                    <span>SMS currency</span>
                    <input name="smsCurrency" maxLength={3} placeholder="IRR" />
                  </label>
                  <div className={styles.full}>
                    <button type="submit">Prepare & calculate eligibility</button>
                  </div>
                </form>
              </section>

              {executions.data.items.length === 0 ? (
                <div className={styles.empty}>
                  هنوز execution canonical برای این Campaign ثبت نشده است.
                </div>
              ) : (
                executions.data.items.map((execution) => (
                  <ExecutionCard key={execution.id} campaignId={campaignId} execution={execution} />
                ))
              )}
            </>
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
