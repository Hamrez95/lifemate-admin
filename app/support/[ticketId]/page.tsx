import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState, AdminPagination } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import {
  getSupportAssignees,
  getSupportTicket,
  getSupportTicketEvents,
  type SupportTicketDetail,
  type SupportTicketEvent,
} from "@/src/lib/admin-api/support-ticket";

import { TicketOperations } from "./TicketOperations";
import styles from "./ticket-detail.module.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_PAGE_SIZE = 20;

const statusLabels: Record<string, string> = {
  Open: "باز",
  Pending: "در انتظار بررسی",
  WaitingOnUser: "منتظر کاربر",
  Resolved: "حل‌شده",
  Closed: "بسته",
};

const priorityLabels: Record<string, string> = {
  Urgent: "فوری",
  High: "بالا",
  Normal: "عادی",
  Low: "پایین",
};

const slaLabels: Record<string, string> = {
  Breached: "نقض SLA",
  DueSoon: "نزدیک سررسید",
  OnTrack: "در مسیر",
  Completed: "تکمیل‌شده",
};

const eventLabels: Record<string, string> = {
  TicketCreated: "تیکت ایجاد شد",
  InternalNoteAdded: "یادداشت داخلی ثبت شد",
  StatusChanged: "وضعیت تغییر کرد",
  PriorityChanged: "اولویت تغییر کرد",
  AssigneeChanged: "مسئول رسیدگی تغییر کرد",
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type TicketDetailPageProps = {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function eventPageHref(ticketId: string, page: number): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("eventPage", String(page));
  const suffix = params.toString();
  return suffix ? `/support/${ticketId}?${suffix}` : `/support/${ticketId}`;
}

function Hero({
  ticket,
  canReadUsers,
  freshness,
}: {
  ticket: SupportTicketDetail;
  canReadUsers: boolean;
  freshness: string;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroMain}>
        <Link className={styles.backLink} href="/support">
          بازگشت به صف پشتیبانی
        </Link>
        <span className={styles.eyebrow}>LifeMate Support Detail</span>
        <div className={styles.titleRow}>
          <h2>
            تیکت #{ticket.ticketNumber.toLocaleString("fa-IR", { useGrouping: false })}
          </h2>
          <span className={styles.productBadge}>{ticket.productCode || "LifeMate"}</span>
        </div>
        <p>
          جزئیات عملیاتی و Timeline این تیکت؛ بدون نمایش متن خام گفتگو، اطلاعات تماس یا داده سلامت.
        </p>
        <div className={styles.requesterRow}>
          <span>درخواست‌دهنده</span>
          {canReadUsers ? (
            <Link href={`/users/${ticket.requesterAccountId}`}>
              {ticket.requesterDisplayName || "کاربر LifeMate"}
            </Link>
          ) : (
            <strong>{ticket.requesterDisplayName || "کاربر LifeMate"}</strong>
          )}
          <code>{ticket.requesterAccountId}</code>
        </div>
      </div>
      <div className={styles.heroMeta}>
        <span className={styles.statusBadge} data-status={ticket.status}>
          {statusLabels[ticket.status] ?? ticket.status}
        </span>
        <span className={styles.priorityBadge} data-priority={ticket.priority}>
          اولویت: {priorityLabels[ticket.priority] ?? ticket.priority}
        </span>
        <span className={styles.slaBadge} data-sla={ticket.slaState}>
          <span className={styles.slaDot} aria-hidden="true" />
          {slaLabels[ticket.slaState] ?? ticket.slaState}
        </span>
        <small>آخرین دریافت: {freshness}</small>
      </div>
    </section>
  );
}

function TicketFacts({ ticket }: { ticket: SupportTicketDetail }) {
  return (
    <section className={styles.facts} aria-label="مشخصات تیکت">
      <div>
        <span>دسته‌بندی</span>
        <strong>{ticket.category}</strong>
      </div>
      <div>
        <span>مسئول</span>
        <strong>{ticket.assigneeDisplayName || "تخصیص‌نیافته"}</strong>
      </div>
      <div>
        <span>سررسید بعدی</span>
        <strong>{formatDateTime(ticket.nextDueAtUtc)}</strong>
      </div>
      <div>
        <span>آخرین فعالیت</span>
        <strong>{formatDateTime(ticket.lastActivityAtUtc)}</strong>
      </div>
      <div>
        <span>ایجاد تیکت</span>
        <strong>{formatDateTime(ticket.createdAtUtc)}</strong>
      </div>
      <div className={styles.summaryFact}>
        <span>خلاصه امن صف</span>
        <strong>{ticket.summary || "—"}</strong>
      </div>
    </section>
  );
}

function EventCard({ event }: { event: SupportTicketEvent }) {
  const isNote = event.eventType === "InternalNoteAdded";
  const hasTransition = event.fromValue !== null || event.toValue !== null;
  return (
    <li className={styles.timelineItem} data-event={event.eventType}>
      <span className={styles.timelineMarker} aria-hidden="true" />
      <article className={styles.timelineCard}>
        <header>
          <div>
            <span>{eventLabels[event.eventType] ?? event.eventType}</span>
            <strong>{event.actorDisplayName || (event.actorAccountId ? "Admin LifeMate" : "System")}</strong>
          </div>
          <time dateTime={event.occurredAtUtc}>{formatDateTime(event.occurredAtUtc)}</time>
        </header>
        {isNote && event.summary ? (
          <div className={styles.noteBox}>
            <span>یادداشت داخلی privacy-minimized</span>
            <p>{event.summary}</p>
          </div>
        ) : null}
        {hasTransition ? (
          <div className={styles.transition} aria-label="تغییر مقدار">
            <span>{event.fromValue || "—"}</span>
            <b aria-hidden="true">←</b>
            <strong>{event.toValue || "—"}</strong>
          </div>
        ) : null}
      </article>
    </li>
  );
}

async function Timeline({ ticketId, page }: { ticketId: string; page: number }) {
  const result = await getSupportTicketEvents(ticketId, page, EVENT_PAGE_SIZE);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden") {
    return <AdminPageState state="forbidden" title="Timeline برای نقش فعلی قابل مشاهده نیست" />;
  }
  if (result.kind === "invalid") {
    return <AdminPageState state="error" title="صفحه Timeline معتبر نیست" />;
  }
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        title="Timeline فعلاً در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const data = result.data;
  if (data.items.length === 0) {
    return <AdminPageState state="empty" title="رویدادی برای این تیکت ثبت نشده است" />;
  }
  const previousHref = data.page > 1 ? eventPageHref(ticketId, data.page - 1) : undefined;
  const nextHref =
    data.page * data.pageSize < data.total
      ? eventPageHref(ticketId, data.page + 1)
      : undefined;

  return (
    <section className={styles.timelineSection} aria-labelledby="support-timeline-title">
      <header className={styles.sectionHeading}>
        <div>
          <span>Ticket timeline</span>
          <h3 id="support-timeline-title">Timeline رسیدگی</h3>
          <p>یادداشت‌ها و تغییرات مدیریتی با ترتیب پایدار و صفحه‌بندی سروری.</p>
        </div>
        <span className={styles.countBadge}>رویداد: {data.total.toLocaleString("fa-IR")}</span>
      </header>
      <ol className={styles.timeline}>
        {data.items.map((event) => (
          <EventCard event={event} key={event.eventId} />
        ))}
      </ol>
      <AdminPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        previousHref={previousHref}
        nextHref={nextHref}
        ariaLabel="صفحه‌بندی Timeline تیکت پشتیبانی"
      />
    </section>
  );
}

async function TicketDetailContent({
  ticketId,
  eventPage,
  canReadUsers,
  canWrite,
}: {
  ticketId: string;
  eventPage: number;
  canReadUsers: boolean;
  canWrite: boolean;
}) {
  const [detailResult, assigneesResult] = await Promise.all([
    getSupportTicket(ticketId),
    canWrite ? getSupportAssignees() : Promise.resolve(null),
  ]);

  if (detailResult.kind === "unauthenticated") redirect("/login");
  if (detailResult.kind === "not_found") notFound();
  if (detailResult.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (detailResult.kind === "invalid") return <AdminPageState state="error" title="شناسه تیکت معتبر نیست" />;
  if (detailResult.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={
          detailResult.correlationId ? `کد پیگیری: ${detailResult.correlationId}` : undefined
        }
      />
    );
  }

  const assignees = assigneesResult?.kind === "ok" ? assigneesResult.data.items : [];
  const ticket = detailResult.data.ticket;

  return (
    <div className={styles.page}>
      <Hero
        ticket={ticket}
        canReadUsers={canReadUsers}
        freshness={formatDateTime(detailResult.data.freshness.asOfUtc)}
      />
      <div className={styles.privacyNotice}>
        <span aria-hidden="true">✦</span>
        <div>
          <strong>مرز حریم خصوصی پشتیبانی</strong>
          <p>
            این صفحه عمداً متن خام گفتگو، فایل ضمیمه، شماره تماس، داده درمانی و Women Health را
            نمایش نمی‌دهد. یادداشت داخلی هم باید فقط شامل حداقل اطلاعات عملیاتی باشد.
          </p>
        </div>
      </div>
      <TicketFacts ticket={ticket} />
      <TicketOperations
        ticketId={ticket.ticketId}
        status={ticket.status}
        priority={ticket.priority}
        assignedAdminAccountId={ticket.assignedAdminAccountId}
        canWrite={canWrite}
        assignees={assignees}
        requestSeed={crypto.randomUUID()}
      />
      <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت Timeline" />}>
        <Timeline ticketId={ticket.ticketId} page={eventPage} />
      </Suspense>
    </div>
  );
}

export default async function TicketDetailPage({ params, searchParams }: TicketDetailPageProps) {
  const [{ ticketId }, query] = await Promise.all([params, searchParams]);
  if (!UUID_PATTERN.test(ticketId)) notFound();

  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("support.read");
  const canWrite = admin.permissions.includes("support.write");
  const canReadUsers = admin.permissions.includes("users.read.basic");
  const eventPage = pageNumber(first(query.eventPage));

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="support"
        title="جزئیات تیکت"
        subtitle="Timeline و عملیات audit-ready با حداقل داده لازم"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense fallback={<AdminPageState state="loading" title="در حال دریافت تیکت" />}>
            <TicketDetailContent
              ticketId={ticketId.toLowerCase()}
              eventPage={eventPage}
              canReadUsers={canReadUsers}
              canWrite={canWrite}
            />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
