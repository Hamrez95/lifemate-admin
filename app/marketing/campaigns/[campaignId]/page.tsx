import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getMarketingCampaignDetail,
  type CampaignPublishStatus,
  type MarketingCampaignDetail,
} from "@/src/lib/admin-api/marketing-campaign-detail";
import type { MarketingCampaignStatus } from "@/src/lib/admin-api/marketing-campaigns";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  requestCampaignPublishAction,
  setCampaignApprovalAction,
  updateCampaignContentAction,
} from "./actions";
import styles from "./campaign-detail.module.css";

type CampaignDetailPageProps = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateTimeFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});
const numberFormat = new Intl.NumberFormat("fa-IR");

const statusLabels: Record<MarketingCampaignStatus, string> = {
  Draft: "پیش‌نویس",
  Ready: "آماده اجرا",
  Active: "فعال",
  Paused: "متوقف",
  Completed: "تکمیل‌شده",
  Cancelled: "لغوشده",
};

const publishLabels: Record<CampaignPublishStatus, string> = {
  Queued: "در صف",
  Processing: "در حال پردازش",
  Published: "منتشر شده",
  Failed: "ناموفق",
  OutcomeUnknown: "نتیجه نامشخص",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function displayDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

function displayMetric(value: number | null): string {
  return value === null ? "ناموجود" : numberFormat.format(value);
}

function ApprovalBanner({ detail }: { detail: MarketingCampaignDetail }) {
  const { content } = detail;
  const exactRevisionApproved =
    content.approvalState === "Approved" &&
    content.approvedRevision === content.contentRevision &&
    content.contentRevision > 0;

  return (
    <section
      className={styles.approvalBanner}
      data-state={exactRevisionApproved ? "approved" : content.approvalState.toLowerCase()}
      aria-label="وضعیت تأیید انسانی محتوا"
    >
      <div>
        <span className={styles.eyebrow}>Human approval gate</span>
        <h3>
          {exactRevisionApproved
            ? `Revision ${numberFormat.format(content.contentRevision)} تأیید شده است`
            : content.contentRevision === 0
              ? "هنوز محتوایی برای تأیید وجود ندارد"
              : "revision فعلی مجوز انتشار ندارد"}
        </h3>
        <p>
          {exactRevisionApproved
            ? `تأیید در ${displayDate(content.approvedAtUtc)} ثبت شده و فقط همین revision را پوشش می‌دهد.`
            : "ویرایش Brief، مخاطب، متن انتشار یا assetها تأیید قبلی را باطل می‌کند و انتشار دوباره نیازمند تأیید انسان است."}
        </p>
      </div>
      <span className={styles.revisionPill}>
        Revision {numberFormat.format(content.contentRevision)}
      </span>
    </section>
  );
}

function CampaignFacts({ detail }: { detail: MarketingCampaignDetail }) {
  const { campaign } = detail;
  return (
    <dl className={styles.factGrid} aria-label="مشخصات کمپین">
      <div>
        <dt>Lifecycle</dt>
        <dd>
          <span className={styles.statusBadge} data-status={campaign.status}>
            {statusLabels[campaign.status]}
          </span>
        </dd>
      </div>
      <div>
        <dt>محصول</dt>
        <dd>{campaign.productCode ?? "تعریف نشده"}</dd>
      </div>
      <div>
        <dt>کانال برنامه‌ریزی</dt>
        <dd>{campaign.channelCode ?? "تعریف نشده"}</dd>
      </div>
      <div>
        <dt>بازه اجرا</dt>
        <dd>
          {displayDate(campaign.startsAtUtc)} تا {displayDate(campaign.endsAtUtc)}
        </dd>
      </div>
    </dl>
  );
}

function ContentWorkspace({
  detail,
  canWrite,
}: {
  detail: MarketingCampaignDetail;
  canWrite: boolean;
}) {
  const { content } = detail;
  return (
    <section className={styles.panel} aria-labelledby="content-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.eyebrow}>Brief & content</span>
          <h3 id="content-title">محتوای قابل بازبینی قبل از Publish</h3>
        </div>
        <span className={styles.muted}>ویرایش = invalidation تأیید قبلی</span>
      </div>

      {canWrite ? (
        <form action={updateCampaignContentAction} className={styles.contentForm}>
          <input type="hidden" name="campaignId" value={detail.campaign.id} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`campaign-content-${detail.campaign.id}-${crypto.randomUUID()}`}
          />
          <label>
            <span>Brief کمپین</span>
            <textarea
              name="brief"
              rows={5}
              maxLength={4000}
              defaultValue={content.brief ?? ""}
              placeholder="هدف خلاقه، پیام اصلی و محدودیت‌های کمپین"
            />
          </label>
          <label>
            <span>خلاصه مخاطب</span>
            <textarea
              name="audienceSummary"
              rows={4}
              maxLength={2000}
              defaultValue={content.audienceSummary ?? ""}
              placeholder="توصیف تجمیعی مخاطب؛ بدون export داده حساس یا health data"
            />
          </label>
          <label className={styles.fullWidth}>
            <span>متن نهایی انتشار</span>
            <textarea
              name="publishText"
              rows={7}
              maxLength={4096}
              defaultValue={content.publishText ?? ""}
              placeholder="متنی که پس از تأیید انسانی برای provider ارسال خواهد شد"
            />
          </label>
          <label className={styles.fullWidth}>
            <span>Asset referenceها — هر خط یک مرجع</span>
            <textarea
              name="assetRefs"
              rows={4}
              maxLength={10000}
              defaultValue={content.assetRefs.join("\n")}
              placeholder="asset:campaign/hero-01"
            />
          </label>
          <label className={styles.fullWidth}>
            <span>دلیل ویرایش</span>
            <input
              name="reason"
              minLength={10}
              maxLength={1000}
              required
              placeholder="برای audit trail توضیح دهید چه چیزی و چرا تغییر کرد"
            />
          </label>
          <button type="submit" className={styles.primaryButton}>
            ذخیره revision جدید
          </button>
        </form>
      ) : (
        <div className={styles.readOnlyContent}>
          <article>
            <h4>Brief</h4>
            <p>{content.brief ?? "هنوز ثبت نشده است."}</p>
          </article>
          <article>
            <h4>مخاطب</h4>
            <p>{content.audienceSummary ?? "هنوز ثبت نشده است."}</p>
          </article>
          <article>
            <h4>متن انتشار</h4>
            <p>{content.publishText ?? "هنوز ثبت نشده است."}</p>
          </article>
        </div>
      )}
    </section>
  );
}

function ApprovalPanel({
  detail,
  canWrite,
}: {
  detail: MarketingCampaignDetail;
  canWrite: boolean;
}) {
  const content = detail.content;
  const approved =
    content.approvalState === "Approved" &&
    content.approvedRevision === content.contentRevision &&
    content.contentRevision > 0;

  return (
    <section className={styles.panel} aria-labelledby="approval-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.eyebrow}>Approval</span>
          <h3 id="approval-title">دروازه تأیید انسانی</h3>
        </div>
      </div>
      <p className={styles.panelText}>
        AI، lifecycle کمپین و وجود Credential هیچ‌کدام جای تأیید انسانی revision فعلی را
        نمی‌گیرند.
      </p>
      {canWrite ? (
        <form action={setCampaignApprovalAction} className={styles.approvalForm}>
          <input type="hidden" name="campaignId" value={detail.campaign.id} />
          <input type="hidden" name="approved" value={String(!approved)} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`campaign-approval-${detail.campaign.id}-${crypto.randomUUID()}`}
          />
          <label>
            <span>{approved ? "دلیل لغو تأیید" : "دلیل تأیید revision فعلی"}</span>
            <textarea name="reason" minLength={10} maxLength={1000} rows={3} required />
          </label>
          <button
            type="submit"
            className={approved ? styles.secondaryButton : styles.approveButton}
            disabled={!approved && (!content.publishText || !detail.campaign.channelCode)}
          >
            {approved ? "لغو تأیید" : "تأیید انسانی برای Publish"}
          </button>
          {!approved && (!content.publishText || !detail.campaign.channelCode) ? (
            <p className={styles.inlineWarning} role="status">
              قبل از تأیید، متن نهایی انتشار و کانال کمپین باید مشخص باشند.
            </p>
          ) : null}
        </form>
      ) : (
        <p className={styles.permissionNote}>
          تغییر تأیید به permission `marketing.campaign.write` نیاز دارد.
        </p>
      )}
    </section>
  );
}

function FunnelPanel({ detail }: { detail: MarketingCampaignDetail }) {
  const funnel = detail.funnel;
  return (
    <section className={styles.panel} aria-labelledby="funnel-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.eyebrow}>Funnel</span>
          <h3 id="funnel-title">قیف اندازه‌گیری‌شده، نه عدد تزئینی</h3>
        </div>
        <span className={styles.muted}>
          {funnel.asOfUtc ? displayDate(funnel.asOfUtc) : "داده‌ای ثبت نشده"}
        </span>
      </div>
      {funnel.availability === "Unavailable" ? (
        <div className={styles.unavailableBox} role="status">
          <strong>Instrumentation این کمپین هنوز داده قابل استنادی ندارد.</strong>
          <p>
            Impression، Click، Landing View و Conversion عمداً صفر نمایش داده نمی‌شوند؛ صفر یک
            اندازه‌گیری واقعی است، اما «ناموجود» یعنی هنوز داده نداریم.
          </p>
          <code>source: {funnel.source}</code>
        </div>
      ) : (
        <div className={styles.metricGrid}>
          <article>
            <span>Impressions</span>
            <strong>{displayMetric(funnel.metrics.impressions)}</strong>
            <small>نمایش ثبت‌شده توسط منبع attribution</small>
          </article>
          <article>
            <span>Clicks</span>
            <strong>{displayMetric(funnel.metrics.clicks)}</strong>
            <small>کلیک ثبت‌شده روی CTA یا لینک کمپین</small>
          </article>
          <article>
            <span>Landing views</span>
            <strong>{displayMetric(funnel.metrics.landingViews)}</strong>
            <small>ورود قابل انتساب به مقصد کمپین</small>
          </article>
          <article>
            <span>Conversions</span>
            <strong>{displayMetric(funnel.metrics.conversions)}</strong>
            <small>رویداد conversion تعریف‌شده برای این کمپین</small>
          </article>
        </div>
      )}
    </section>
  );
}

function PublishPanel({
  detail,
  canPublish,
}: {
  detail: MarketingCampaignDetail;
  canPublish: boolean;
}) {
  const { campaign, content, channel } = detail;
  const lifecycleReady = campaign.status === "Ready" || campaign.status === "Active";
  const revisionApproved =
    content.approvalState === "Approved" &&
    content.approvedRevision === content.contentRevision &&
    content.contentRevision > 0;
  const channelReady =
    channel?.operatorStatus === "Enabled" &&
    channel.setupStatus === "CredentialAvailable" &&
    channel.credentialAvailable;
  const ready = Boolean(canPublish && lifecycleReady && revisionApproved && channelReady);

  return (
    <section className={styles.publishPanel} aria-labelledby="publish-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.eyebrow}>External side effect</span>
          <h3 id="publish-title">انتشار، یک execution مستقل از Campaign lifecycle است</h3>
        </div>
        <span className={styles.riskPill}>High risk</span>
      </div>

      <div className={styles.readinessGrid}>
        <div data-ready={lifecycleReady}>
          <span>Lifecycle</span>
          <strong>{lifecycleReady ? "آماده" : statusLabels[campaign.status]}</strong>
        </div>
        <div data-ready={revisionApproved}>
          <span>Human approval</span>
          <strong>{revisionApproved ? "تأیید شده" : "نیازمند تأیید"}</strong>
        </div>
        <div data-ready={Boolean(channelReady)}>
          <span>Channel setup</span>
          <strong>{channelReady ? "Credential آماده" : "آماده نیست"}</strong>
        </div>
        <div data-ready={false}>
          <span>Provider connectivity</span>
          <strong>NotVerified</strong>
        </div>
      </div>

      <div className={styles.truthBox}>
        <strong>Credential موجود ≠ Connected</strong>
        <p>
          connectivity عمداً «بررسی‌نشده» باقی می‌ماند. فقط پاسخ واقعی provider می‌تواند execution را
          Published کند؛ خطای مبهم یا crash بعد از side effect به `OutcomeUnknown` می‌رود تا انتشار
          تکراری خودکار رخ ندهد.
        </p>
      </div>

      {channel ? (
        <p className={styles.channelLine}>
          کانال: <strong>{channel.displayName}</strong> · operational:{" "}
          {channel.operatorStatus === "Enabled" ? "فعال" : "غیرفعال"} · setup:{" "}
          {channel.setupStatus}
        </p>
      ) : (
        <p className={styles.inlineWarning}>برای این کمپین کانال امنی قابل resolve نیست.</p>
      )}

      {canPublish ? (
        <details className={styles.publishConfirm}>
          <summary>باز کردن تأیید نهایی Publish</summary>
          <form action={requestCampaignPublishAction}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <input
              type="hidden"
              name="idempotencyKey"
              value={`campaign-publish-${campaign.id}-${crypto.randomUUID()}`}
            />
            <p>
              این درخواست در outbox ثبت می‌شود و campaign را خودکار Active یا Published نمی‌کند.
            </p>
            <label>
              <span>دلیل انتشار</span>
              <textarea
                name="reason"
                minLength={10}
                maxLength={1000}
                rows={3}
                required
                placeholder="تأیید کنید چرا همین revision باید اکنون منتشر شود"
              />
            </label>
            <button type="submit" className={styles.publishButton} disabled={!ready}>
              ثبت درخواست Publish امن
            </button>
            {!ready ? (
              <p className={styles.inlineWarning} role="status">
                Lifecycle، تأیید revision یا setup کانال هنوز شروط لازم را ندارد.
              </p>
            ) : null}
          </form>
        </details>
      ) : (
        <p className={styles.permissionNote}>
          Publish به permission پرریسک `marketing.social.publish` نیاز دارد.
        </p>
      )}
    </section>
  );
}

function PublishHistory({ detail }: { detail: MarketingCampaignDetail }) {
  return (
    <section className={styles.panel} aria-labelledby="history-title">
      <div className={styles.panelHead}>
        <div>
          <span className={styles.eyebrow}>Execution history</span>
          <h3 id="history-title">تاریخچه انتشار</h3>
        </div>
      </div>
      {detail.publishHistory.length === 0 ? (
        <div className={styles.emptyHistory}>
          هنوز هیچ درخواست Publish برای این کمپین ثبت نشده است.
        </div>
      ) : (
        <div className={styles.historyList}>
          {detail.publishHistory.map((execution) => (
            <article key={execution.id} data-status={execution.status}>
              <div>
                <span className={styles.publishBadge} data-status={execution.status}>
                  {publishLabels[execution.status]}
                </span>
                <strong>{execution.providerCode}</strong>
                <small>Revision {numberFormat.format(execution.contentRevision)}</small>
              </div>
              <dl>
                <div>
                  <dt>درخواست</dt>
                  <dd>{displayDate(execution.requestedAtUtc)}</dd>
                </div>
                <div>
                  <dt>پایان</dt>
                  <dd>{displayDate(execution.completedAtUtc)}</dd>
                </div>
                <div>
                  <dt>Provider ref</dt>
                  <dd>{execution.providerPostRef ?? "—"}</dd>
                </div>
                <div>
                  <dt>Failure code</dt>
                  <dd>{execution.failureCode ?? "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");
  const canWrite = admin.permissions.includes("marketing.campaign.write");
  const canPublish = admin.permissions.includes("marketing.social.publish");
  const { campaignId } = await params;
  const result = canRead ? await getMarketingCampaignDetail(campaignId) : null;
  if (result?.kind === "unauthenticated") redirect("/login");
  const raw = await searchParams;
  const notice = one(raw.notice);
  const message = one(raw.message);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="جزئیات کمپین"
        subtitle="Brief، Funnel، تأیید انسانی و Publish execution با مرز امنیتی روشن"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Campaign control room</p>
              <h2>{result?.kind === "ok" ? result.data.campaign.name : "Campaign Detail"}</h2>
              <p>
                lifecycle کمپین، تأیید محتوا و وضعیت provider سه مفهوم جدا هستند. این صفحه آن‌ها را
                کنار هم نشان می‌دهد، بدون جعل اتصال یا metric.
              </p>
            </div>
            <nav className={styles.heroActions} aria-label="مسیرهای Marketing">
              <Link href="/marketing/campaigns">همه کمپین‌ها</Link>
              <Link href="/marketing/channels">اتصال کانال‌ها</Link>
            </nav>
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

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "not_found" ? (
            <AdminPageState
              state="empty"
              title="کمپین پیدا نشد"
              description="شناسه کمپین در aggregate امن Marketing وجود ندارد."
            />
          ) : result?.kind === "invalid" ? (
            <AdminPageState state="error" title="شناسه کمپین معتبر نیست" />
          ) : result?.kind === "unavailable" ? (
            <AdminPageState
              state="unavailable"
              description={
                result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined
              }
            />
          ) : result?.kind === "ok" ? (
            <>
              <CampaignFacts detail={result.data} />
              <ApprovalBanner detail={result.data} />
              <div className={styles.workspaceGrid}>
                <ContentWorkspace detail={result.data} canWrite={canWrite} />
                <ApprovalPanel detail={result.data} canWrite={canWrite} />
                <FunnelPanel detail={result.data} />
                <PublishPanel detail={result.data} canPublish={canPublish} />
                <PublishHistory detail={result.data} />
              </div>
              <p className={styles.freshness}>
                منبع: {result.data.freshness.source} · آخرین خواندن:{" "}
                {displayDate(result.data.freshness.asOfUtc)}
              </p>
            </>
          ) : (
            <AdminPageState state="unavailable" />
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
