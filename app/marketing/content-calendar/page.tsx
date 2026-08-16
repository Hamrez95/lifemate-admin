import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getMarketingContentCalendar,
  marketingCalendarPublishStatuses,
  marketingCalendarTimezones,
  type MarketingApprovalQueueItem,
  type MarketingCalendarItem,
  type MarketingCalendarPublishStatus,
  type MarketingCalendarTimezone,
  type MarketingContentCalendarReport,
} from "@/src/lib/admin-api/marketing-content-calendar";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  cancelScheduledPublishAction,
  retryFailedPublishAction,
  scheduleCampaignPublishAction,
} from "./actions";
import styles from "./calendar.module.css";

type ContentCalendarPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type CalendarView = "calendar" | "list";

const statusLabels: Record<MarketingCalendarPublishStatus, string> = {
  Scheduled: "زمان‌بندی‌شده",
  Queued: "در صف",
  Processing: "در حال ارسال",
  Published: "منتشرشده",
  Failed: "ناموفق",
  OutcomeUnknown: "نتیجه نامشخص",
  Cancelled: "لغوشده",
};

const approvalLabels = {
  Pending: "در انتظار تأیید",
  Approved: "تأیید انسانی شده",
  Revoked: "تأیید لغو شده",
} as const;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function safeView(value: string): CalendarView {
  return value === "list" ? "list" : "calendar";
}

function safeNotice(value: string): "success" | "error" | null {
  return value === "success" || value === "error" ? value : null;
}

function filterParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "timezone", "status"] as const) {
    const value = one(raw[key]).trim();
    if (value) params.set(key, value);
  }
  return params;
}

function viewHref(
  raw: Record<string, string | string[] | undefined>,
  view: CalendarView,
): string {
  const params = filterParams(raw);
  params.set("view", view);
  return `/marketing/content-calendar?${params.toString()}`;
}

function dateFormatter(timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function timeFormatter(timezone: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function instantFormatter(timezone: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function localDateKey(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function executionInstant(item: MarketingCalendarItem): string {
  return item.scheduledForUtc ?? item.requestedAtUtc;
}

function groupByDay(
  items: MarketingCalendarItem[],
  timezone: string,
): Array<{ key: string; items: MarketingCalendarItem[] }> {
  const groups = new Map<string, MarketingCalendarItem[]>();
  for (const item of items) {
    const key = localDateKey(executionInstant(item), timezone);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, dayItems]) => ({ key, items: dayItems }));
}

function canSchedule(item: MarketingApprovalQueueItem): boolean {
  return (
    item.approvalState === "Approved" &&
    item.campaignStatus !== "Completed" &&
    item.campaignStatus !== "Cancelled" &&
    item.channel?.operatorStatus === "Enabled" &&
    item.channel.setupStatus === "CredentialAvailable" &&
    item.channel.credentialAvailable
  );
}

function QueueCard({
  item,
  timezone,
  canWrite,
  canPublish,
}: {
  item: MarketingApprovalQueueItem;
  timezone: MarketingCalendarTimezone;
  canWrite: boolean;
  canPublish: boolean;
}) {
  const ready = canSchedule(item);
  return (
    <article className={styles.queueCard} data-approval={item.approvalState}>
      <div className={styles.cardTop}>
        <div>
          <span className={styles.eyebrow}>Revision {item.contentRevision.toLocaleString("fa-IR")}</span>
          <h4>{item.campaignName}</h4>
        </div>
        <div className={styles.badges}>
          <span className={styles.badge} data-state={item.approvalState}>
            {approvalLabels[item.approvalState]}
          </span>
          <span className={styles.badge}>{item.providerCode ?? "بدون کانال"}</span>
        </div>
      </div>

      <div className={styles.preview}>
        {item.publishTextPreview || "متن قابل انتشار برای این revision ثبت نشده است."}
      </div>

      <div className={styles.metaRow}>
        <span className={styles.badge}>Campaign: {item.campaignStatus}</span>
        <span className={styles.badge}>Setup: {item.channel?.setupStatus ?? "SetupRequired"}</span>
        <span className={styles.badge}>Connectivity: NotVerified</span>
      </div>

      <Link className={styles.campaignLink} href={`/marketing/campaigns/${item.campaignId}`}>
        باز کردن محتوا و approval کمپین
      </Link>

      {item.approvalState !== "Approved" ? (
        <p className={styles.guardrailText}>
          تا وقتی همین revision توسط انسان Approved نشود، هیچ زمان‌بندی یا publish job ساخته نمی‌شود.
        </p>
      ) : !ready ? (
        <p className={styles.guardrailText}>
          محتوا Approved است، اما کانال هنوز operationally ready نیست. CredentialAvailable هرگز به
          معنی Connected نیست و connectivity همچنان NotVerified است.
        </p>
      ) : !canWrite || !canPublish ? (
        <p className={styles.guardrailText}>
          برای schedule هر دو permission `marketing.campaign.write` و `marketing.social.publish`
          لازم‌اند.
        </p>
      ) : (
        <form action={scheduleCampaignPublishAction} className={styles.scheduleForm}>
          <input type="hidden" name="campaignId" value={item.campaignId} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`calendar:schedule:${crypto.randomUUID()}`}
          />
          <div className={styles.scheduleGrid}>
            <label>
              <span>تاریخ و ساعت محلی</span>
              <input type="datetime-local" name="scheduledLocal" required />
            </label>
            <label>
              <span>Timezone</span>
              <select name="timezone" defaultValue={timezone}>
                {marketingCalendarTimezones.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span>دلیل زمان‌بندی</span>
            <input
              name="reason"
              minLength={10}
              maxLength={1000}
              required
              placeholder="مثلاً: زمان انتشار کمپین لانچ پس از تأیید نهایی تیم"
            />
          </label>
          <p className={styles.formHint}>
            در زمان مقرر، approval revision و channel readiness دوباره server-side بررسی می‌شوند.
          </p>
          <button className={styles.primaryButton} type="submit">
            زمان‌بندی انتشار
          </button>
        </form>
      )}
    </article>
  );
}

function ExecutionActions({
  item,
  canWrite,
  canPublish,
}: {
  item: MarketingCalendarItem;
  canWrite: boolean;
  canPublish: boolean;
}) {
  if (item.publishStatus === "OutcomeUnknown") {
    return (
      <div className={styles.outcomeBox}>
        OutcomeUnknown عمداً fail-closed است. Retry خودکار یا دستی از این state در این UI ارائه
        نمی‌شود تا duplicate publish ایجاد نشود.
      </div>
    );
  }
  if (item.publishStatus === "Scheduled" && canPublish) {
    return (
      <form action={cancelScheduledPublishAction} className={styles.actionForm}>
        <input type="hidden" name="executionId" value={item.executionId} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`calendar:cancel:${crypto.randomUUID()}`}
        />
        <label>
          <span>دلیل لغو</span>
          <input name="reason" minLength={10} maxLength={1000} required />
        </label>
        <button className={styles.dangerButton} type="submit">
          لغو زمان‌بندی
        </button>
      </form>
    );
  }
  if (item.publishStatus === "Failed" && canPublish && canWrite) {
    return (
      <form action={retryFailedPublishAction} className={styles.actionForm}>
        <input type="hidden" name="executionId" value={item.executionId} />
        <input
          type="hidden"
          name="idempotencyKey"
          value={`calendar:retry:${crypto.randomUUID()}`}
        />
        <label>
          <span>دلیل retry</span>
          <input name="reason" minLength={10} maxLength={1000} required />
        </label>
        <button className={styles.retryButton} type="submit">
          Retry امن
        </button>
      </form>
    );
  }
  return null;
}

function ExecutionCard({
  item,
  timezone,
  canWrite,
  canPublish,
}: {
  item: MarketingCalendarItem;
  timezone: string;
  canWrite: boolean;
  canPublish: boolean;
}) {
  const instant = new Date(executionInstant(item));
  return (
    <article className={styles.executionCard} data-status={item.publishStatus}>
      <div className={styles.executionTop}>
        <div>
          <span className={styles.eyebrow}>{item.providerCode}</span>
          <h4>{item.campaignName}</h4>
        </div>
        <span className={styles.badge} data-state={item.publishStatus}>
          {statusLabels[item.publishStatus]}
        </span>
      </div>
      <div className={styles.executionTime}>
        {timeFormatter(timezone).format(instant)} · {item.scheduleTimezone ?? timezone}
      </div>
      <div className={styles.metaRow}>
        <span className={styles.badge}>Revision {item.contentRevision.toLocaleString("fa-IR")}</span>
        <span className={styles.badge}>Approval: {item.approvalState ?? "—"}</span>
        <span className={styles.badge}>Connectivity: NotVerified</span>
      </div>
      {item.failureCode ? <p>Failure code: {item.failureCode}</p> : null}
      {item.retryOfExecutionId ? <p>Retry of: {item.retryOfExecutionId}</p> : null}
      <Link className={styles.campaignLink} href={`/marketing/campaigns/${item.campaignId}`}>
        جزئیات کمپین و publish history
      </Link>
      <ExecutionActions item={item} canWrite={canWrite} canPublish={canPublish} />
    </article>
  );
}

function CalendarViewSection({
  report,
  canWrite,
  canPublish,
}: {
  report: MarketingContentCalendarReport;
  canWrite: boolean;
  canPublish: boolean;
}) {
  const groups = groupByDay(report.items, report.query.timezone);
  if (groups.length === 0) {
    return (
      <div className={styles.emptyBox}>
        در این بازه هیچ publish execution واقعی وجود ندارد؛ تقویم با event نمایشی پر نمی‌شود.
      </div>
    );
  }
  return (
    <div className={styles.days}>
      {groups.map((group) => {
        const first = new Date(executionInstant(group.items[0]));
        return (
          <section className={styles.day} key={group.key}>
            <div className={styles.dayHead}>
              <h4>{dateFormatter(report.query.timezone).format(first)}</h4>
              <span>{group.items.length.toLocaleString("fa-IR")} execution</span>
            </div>
            <div className={styles.executionGrid}>
              {group.items.map((item) => (
                <ExecutionCard
                  key={item.executionId}
                  item={item}
                  timezone={report.query.timezone}
                  canWrite={canWrite}
                  canPublish={canPublish}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ListViewSection({ report }: { report: MarketingContentCalendarReport }) {
  if (report.items.length === 0) {
    return (
      <div className={styles.emptyBox}>
        در این بازه هیچ publish execution واقعی وجود ندارد؛ ردیف ساختگی نمایش داده نمی‌شود.
      </div>
    );
  }
  const formatter = instantFormatter(report.query.timezone);
  return (
    <div className={styles.listWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>کمپین</th>
            <th>زمان / Timezone</th>
            <th>کانال</th>
            <th>Revision</th>
            <th>Publish state</th>
            <th>Provider evidence</th>
          </tr>
        </thead>
        <tbody>
          {report.items.map((item) => (
            <tr key={item.executionId}>
              <td>
                <Link className={styles.campaignLink} href={`/marketing/campaigns/${item.campaignId}`}>
                  {item.campaignName}
                </Link>
              </td>
              <td>
                {formatter.format(new Date(executionInstant(item)))}
                <br />
                <small>{item.scheduleTimezone ?? report.query.timezone}</small>
              </td>
              <td>{item.providerCode}</td>
              <td>{item.contentRevision.toLocaleString("fa-IR")}</td>
              <td>{statusLabels[item.publishStatus]}</td>
              <td>Connectivity: NotVerified</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ContentCalendarPage({ searchParams }: ContentCalendarPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");
  const canWrite = admin.permissions.includes("marketing.campaign.write");
  const canPublish = admin.permissions.includes("marketing.social.publish");
  const raw = await searchParams;
  const params = filterParams(raw);
  const view = safeView(one(raw.view));
  const notice = safeNotice(one(raw.notice));
  const noticeMessage = one(raw.message).slice(0, 500);
  const result = canRead ? await getMarketingContentCalendar(params) : null;
  if (result?.kind === "unauthenticated") redirect("/login");

  const report = result?.kind === "ok" ? result.data : null;
  const scheduled = report?.items.filter((item) => item.publishStatus === "Scheduled").length ?? 0;
  const failed = report?.items.filter((item) => item.publishStatus === "Failed").length ?? 0;
  const unknown = report?.items.filter((item) => item.publishStatus === "OutcomeUnknown").length ?? 0;
  const pendingApproval =
    report?.approvalQueue.filter((item) => item.approvalState === "Pending").length ?? 0;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="Content Calendar"
        subtitle="Approval queue، زمان‌بندی و publish execution با وضعیت واقعی"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Human-approved publishing</span>
              <h2>تقویم محتوا، بدون اینکه زمان‌بندی approval را دور بزند.</h2>
              <p>
                Schedule فقط برای همان revision تأییدشده ساخته می‌شود. در زمان dispatch، lifecycle،
                approval و readiness کانال دوباره بررسی می‌شوند و provider failure هیچ‌وقت state کمپین
                را خراب نمی‌کند.
              </p>
            </div>
            <aside className={styles.safetyCard} aria-label="قواعد ایمنی انتشار زمان‌بندی‌شده">
              <strong>Publish safety gates</strong>
              <ul className={styles.safetyList}>
                <li>Human approval الزامی</li>
                <li>Schedule و retry idempotent</li>
                <li>OutcomeUnknown بدون retry</li>
                <li>Provider connectivity = NotVerified</li>
              </ul>
            </aside>
          </header>

          {notice && noticeMessage ? (
            <div
              className={styles.notice}
              data-kind={notice}
              role={notice === "error" ? "alert" : "status"}
            >
              {noticeMessage}
            </div>
          ) : null}

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "invalid" ? (
            <AdminPageState
              state="error"
              title="فیلتر تقویم معتبر نیست"
              description={result.message}
            />
          ) : result?.kind === "unavailable" ? (
            <AdminPageState
              state="unavailable"
              description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
            />
          ) : !report ? (
            <AdminPageState state="unavailable" />
          ) : (
            <>
              <section className={styles.filterCard} aria-labelledby="calendar-filter-title">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>Visible timezone · bounded range</span>
                    <h3 id="calendar-filter-title">بازه تقویم</h3>
                    <p>حداکثر ۱۸۰ روز؛ timezone همیشه کنار زمان schedule دیده می‌شود.</p>
                  </div>
                  <div className={styles.viewToggle} aria-label="نوع نمایش">
                    <Link href={viewHref(raw, "calendar")} data-active={view === "calendar"}>
                      تقویم
                    </Link>
                    <Link href={viewHref(raw, "list")} data-active={view === "list"}>
                      لیست
                    </Link>
                  </div>
                </div>
                <form method="get" className={styles.filterForm}>
                  <input type="hidden" name="view" value={view} />
                  <label>
                    <span>از</span>
                    <input type="date" name="from" defaultValue={report.query.from} />
                  </label>
                  <label>
                    <span>تا</span>
                    <input type="date" name="to" defaultValue={report.query.to} />
                  </label>
                  <label>
                    <span>Timezone</span>
                    <select name="timezone" defaultValue={report.query.timezone}>
                      {marketingCalendarTimezones.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Publish state</span>
                    <select name="status" defaultValue={report.query.status ?? ""}>
                      <option value="">همه وضعیت‌ها</option>
                      {marketingCalendarPublishStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">اعمال فیلتر</button>
                </form>
              </section>

              <section className={styles.summaryGrid} aria-label="خلاصه وضعیت publishing">
                <article className={styles.summaryCard}>
                  <span>در انتظار approval</span>
                  <strong>{pendingApproval.toLocaleString("fa-IR")}</strong>
                  <small>از داده واقعی approval queue</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>Scheduled</span>
                  <strong>{scheduled.toLocaleString("fa-IR")}</strong>
                  <small>در بازه انتخاب‌شده</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>Failed</span>
                  <strong>{failed.toLocaleString("fa-IR")}</strong>
                  <small>فقط failure قطعی قابل retry است</small>
                </article>
                <article className={styles.summaryCard}>
                  <span>OutcomeUnknown</span>
                  <strong>{unknown.toLocaleString("fa-IR")}</strong>
                  <small>Fail-closed؛ retry ممنوع</small>
                </article>
              </section>

              <section className={styles.queueSection} aria-labelledby="approval-queue-title">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>Approval queue</span>
                    <h3 id="approval-queue-title">محتواهای آماده یا منتظر تصمیم انسانی</h3>
                    <p>
                      AI Draft یا Campaign state هیچ‌کدام جای approval revision را نمی‌گیرند. Schedule
                      فقط از کارت Approved و channel-ready فعال می‌شود.
                    </p>
                  </div>
                  <span className={styles.badge}>
                    {report.approvalQueue.length.toLocaleString("fa-IR")} campaign
                  </span>
                </div>
                {report.approvalQueue.length === 0 ? (
                  <div className={styles.emptyBox}>هیچ campaign content واقعی در approval queue نیست.</div>
                ) : (
                  <div className={styles.queueGrid}>
                    {report.approvalQueue.map((item) => (
                      <QueueCard
                        key={item.campaignId}
                        item={item}
                        timezone={report.query.timezone}
                        canWrite={canWrite}
                        canPublish={canPublish}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.timelineSection} aria-labelledby="publishing-calendar-title">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>Publish executions</span>
                    <h3 id="publishing-calendar-title">
                      {view === "calendar" ? "تقویم اجرای انتشار" : "لیست اجرای انتشار"}
                    </h3>
                    <p>
                      Drag & drop عمداً در Phase 1 فعال نیست؛ تغییر schedule فقط با action صریح و
                      reason انجام می‌شود تا keyboard/audit/idempotency حفظ شود.
                    </p>
                  </div>
                  <span className={styles.badge}>Timezone: {report.query.timezone}</span>
                </div>
                {view === "calendar" ? (
                  <CalendarViewSection report={report} canWrite={canWrite} canPublish={canPublish} />
                ) : (
                  <ListViewSection report={report} />
                )}
              </section>
            </>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
