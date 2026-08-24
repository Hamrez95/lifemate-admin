"use client";

import { useActionState, useMemo, useState } from "react";

import type { SupportAssignee } from "@/src/lib/admin-api/support-ticket";

import { initialSupportActionFormState, runSupportTicketAction } from "./actions";
import feedbackStyles from "./operation-feedback.module.css";
import styles from "./ticket-detail.module.css";

type TicketOperationsProps = {
  ticketId: string;
  status: string;
  priority: string;
  assignedAdminAccountId: string | null;
  canWrite: boolean;
  assignees: SupportAssignee[];
  requestSeed: string;
};

function useIdempotencyKey(seed: string) {
  const [key, setKey] = useState(seed);
  return { key, rotate: () => setKey(crypto.randomUUID()) };
}

function Feedback({ state }: { state: typeof initialSupportActionFormState }) {
  if (state.status === "idle" || !state.message) return <div className={styles.feedback} />;
  return (
    <div className={styles.feedback} data-status={state.status} aria-live="polite">
      {state.message}
    </div>
  );
}

function SubmitLabel({ pending, idle }: { pending: boolean; idle: string }) {
  return pending ? (
    <span className={feedbackStyles.pendingLabel}>
      <span className={feedbackStyles.spinner} aria-hidden="true" />
      در حال ارسال…
    </span>
  ) : (
    idle
  );
}

function NoteForm({ ticketId, seed }: { ticketId: string; seed: string }) {
  const [state, action, pending] = useActionState(
    runSupportTicketAction,
    initialSupportActionFormState,
  );
  const request = useIdempotencyKey(seed);
  return (
    <form action={action} className={styles.operationCard} aria-busy={pending}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="action" value="add_note" />
      <input type="hidden" name="idempotencyKey" value={request.key} />
      <div className={styles.operationHeading}>
        <span className={styles.operationIcon} data-tone="violet" aria-hidden="true">
          ✎
        </span>
        <div>
          <strong>یادداشت داخلی</strong>
          <small>فقط برای تیم پشتیبانی</small>
        </div>
      </div>
      <label className={styles.field}>
        <span>متن یادداشت</span>
        <textarea
          name="note"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          disabled={pending}
          placeholder="خلاصه عملیاتی بدون اطلاعات سلامت، تماس یا جزئیات حساس غیرضروری…"
          onChange={request.rotate}
        />
        <small>
          متن یادداشت در Audit metadata کپی نمی‌شود؛ فقط اطلاعات حداقلی و غیرپزشکی ثبت کنید.
        </small>
      </label>
      <Feedback state={state} />
      <button className={styles.primaryButton} data-tone="violet" type="submit" disabled={pending}>
        <SubmitLabel pending={pending} idle="ثبت یادداشت" />
      </button>
    </form>
  );
}

function StatusForm({
  ticketId,
  current,
  seed,
}: {
  ticketId: string;
  current: string;
  seed: string;
}) {
  const [state, action, pending] = useActionState(
    runSupportTicketAction,
    initialSupportActionFormState,
  );
  const request = useIdempotencyKey(seed);
  return (
    <form action={action} className={styles.operationCard} aria-busy={pending}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="action" value="set_status" />
      <input type="hidden" name="idempotencyKey" value={request.key} />
      <div className={styles.operationHeading}>
        <span className={styles.operationIcon} data-tone="green" aria-hidden="true">
          ✓
        </span>
        <div>
          <strong>وضعیت تیکت</strong>
          <small>چرخه رسیدگی audited</small>
        </div>
      </div>
      <label className={styles.field}>
        <span>وضعیت جدید</span>
        <select name="status" defaultValue={current} disabled={pending} onChange={request.rotate}>
          <option value="Open">باز</option>
          <option value="Pending">در انتظار بررسی</option>
          <option value="WaitingOnUser">منتظر کاربر</option>
          <option value="Resolved">حل‌شده</option>
          <option value="Closed">بسته</option>
        </select>
      </label>
      <small className={feedbackStyles.auditHint}>
        تغییر وضعیت فقط از Admin API انجام می‌شود و رویداد آن در Timeline/Audit ثبت می‌شود.
      </small>
      <Feedback state={state} />
      <button className={styles.primaryButton} data-tone="green" type="submit" disabled={pending}>
        <SubmitLabel pending={pending} idle="تغییر وضعیت" />
      </button>
    </form>
  );
}

function PriorityForm({
  ticketId,
  current,
  seed,
}: {
  ticketId: string;
  current: string;
  seed: string;
}) {
  const [state, action, pending] = useActionState(
    runSupportTicketAction,
    initialSupportActionFormState,
  );
  const request = useIdempotencyKey(seed);
  return (
    <form action={action} className={styles.operationCard} aria-busy={pending}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="action" value="set_priority" />
      <input type="hidden" name="idempotencyKey" value={request.key} />
      <div className={styles.operationHeading}>
        <span className={styles.operationIcon} data-tone="orange" aria-hidden="true">
          !
        </span>
        <div>
          <strong>اولویت</strong>
          <small>ترتیب رسیدگی</small>
        </div>
      </div>
      <label className={styles.field}>
        <span>اولویت جدید</span>
        <select name="priority" defaultValue={current} disabled={pending} onChange={request.rotate}>
          <option value="Low">پایین</option>
          <option value="Normal">عادی</option>
          <option value="High">بالا</option>
          <option value="Urgent">فوری</option>
        </select>
      </label>
      <Feedback state={state} />
      <button className={styles.primaryButton} data-tone="orange" type="submit" disabled={pending}>
        <SubmitLabel pending={pending} idle="تغییر اولویت" />
      </button>
    </form>
  );
}

function AssigneeForm({
  ticketId,
  current,
  assignees,
  seed,
}: {
  ticketId: string;
  current: string | null;
  assignees: SupportAssignee[];
  seed: string;
}) {
  const [state, action, pending] = useActionState(
    runSupportTicketAction,
    initialSupportActionFormState,
  );
  const request = useIdempotencyKey(seed);
  const options = useMemo(
    () =>
      assignees.map((assignee) => ({
        value: assignee.accountId,
        label: assignee.displayName || `Admin ${assignee.accountId.slice(0, 8)}…`,
      })),
    [assignees],
  );
  return (
    <form action={action} className={styles.operationCard} aria-busy={pending}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="action" value="set_assignee" />
      <input type="hidden" name="idempotencyKey" value={request.key} />
      <div className={styles.operationHeading}>
        <span className={styles.operationIcon} data-tone="blue" aria-hidden="true">
          ↗
        </span>
        <div>
          <strong>مسئول رسیدگی</strong>
          <small>عضو فعال تیم پشتیبانی</small>
        </div>
      </div>
      <label className={styles.field}>
        <span>تخصیص به</span>
        <select
          name="assigneeAccountId"
          defaultValue={current ?? ""}
          disabled={pending}
          onChange={request.rotate}
        >
          <option value="">تخصیص‌نیافته</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Feedback state={state} />
      <button className={styles.primaryButton} data-tone="blue" type="submit" disabled={pending}>
        <SubmitLabel pending={pending} idle="به‌روزرسانی مسئول" />
      </button>
    </form>
  );
}

export function TicketOperations({
  ticketId,
  status,
  priority,
  assignedAdminAccountId,
  canWrite,
  assignees,
  requestSeed,
}: TicketOperationsProps) {
  if (!canWrite) {
    return (
      <section className={styles.readOnlyPanel} aria-label="عملیات تیکت">
        <div>
          <span>Support operations</span>
          <strong>حالت فقط مشاهده</strong>
          <p>برای یادداشت، تغییر وضعیت، اولویت یا مسئول تیکت، مجوز support.write لازم است.</p>
        </div>
        <span className={styles.readOnlyBadge}>support.read</span>
      </section>
    );
  }

  return (
    <section className={styles.operations} aria-labelledby="ticket-operations-title">
      <header className={styles.sectionHeading}>
        <div>
          <span>Audited actions</span>
          <h3 id="ticket-operations-title">عملیات تیکت</h3>
          <p>فقط عملیات پشتیبانی‌شده Admin API؛ idempotent، permission-checked و audit-ready.</p>
        </div>
      </header>
      <div className={styles.operationGrid}>
        <NoteForm ticketId={ticketId} seed={`${requestSeed}:note`} />
        <StatusForm ticketId={ticketId} current={status} seed={`${requestSeed}:status`} />
        <PriorityForm ticketId={ticketId} current={priority} seed={`${requestSeed}:priority`} />
        <AssigneeForm
          ticketId={ticketId}
          current={assignedAdminAccountId}
          assignees={assignees}
          seed={`${requestSeed}:assignee`}
        />
      </div>
    </section>
  );
}
