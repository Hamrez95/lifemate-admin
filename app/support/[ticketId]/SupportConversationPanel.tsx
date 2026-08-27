"use client";

import { useActionState, useState } from "react";

import type {
  SupportConversationEscalation,
  SupportConversationLink,
  SupportConversationMessage,
} from "@/src/lib/admin-api/support-conversation";

import {
  escalateConversation,
  initialConversationActionState,
  linkConversationReference,
  sendConversationMessage,
} from "./conversation-actions";
import styles from "./support-conversation.module.css";

type Props = {
  ticketId: string;
  canWrite: boolean;
  messages: SupportConversationMessage[];
  escalations: SupportConversationEscalation[];
  links: SupportConversationLink[];
  requestSeed: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

function Feedback({ state }: { state: typeof initialConversationActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p className={styles.feedback} data-status={state.status} aria-live="polite">
      {state.message}
    </p>
  );
}

function MessageComposer({ ticketId, seed }: { ticketId: string; seed: string }) {
  const [state, action, pending] = useActionState(
    sendConversationMessage,
    initialConversationActionState,
  );
  const [nonce, setNonce] = useState(seed);
  const rotate = () => setNonce(crypto.randomUUID());
  return (
    <form action={action} className={styles.composer} aria-busy={pending}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="clientMessageId" value={nonce} />
      <input type="hidden" name="idempotencyKey" value={`support-message:${nonce}`} />
      <label>
        <span>پاسخ به کاربر</span>
        <textarea
          name="body"
          rows={4}
          maxLength={4000}
          required
          disabled={pending}
          onChange={rotate}
          placeholder="پیام پشتیبانی؛ از درخواست اطلاعات سلامت غیرضروری خودداری کنید…"
        />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending}>
        {pending ? "در حال ارسال…" : "ارسال پیام"}
      </button>
    </form>
  );
}

function EscalationForm({ ticketId, seed }: { ticketId: string; seed: string }) {
  const [state, action, pending] = useActionState(
    escalateConversation,
    initialConversationActionState,
  );
  const [nonce, setNonce] = useState(seed);
  return (
    <form action={action} className={styles.operationCard} aria-busy={pending}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="idempotencyKey" value={`support-escalation:${nonce}`} />
      <strong>ارجاع به تیم دیگر</strong>
      <label>
        <span>Role code مقصد</span>
        <input
          name="targetRoleCode"
          required
          minLength={2}
          maxLength={64}
          onChange={() => setNonce(crypto.randomUUID())}
          placeholder="engineering"
        />
      </label>
      <label>
        <span>دلیل عملیاتی امن</span>
        <textarea
          name="safeReason"
          required
          minLength={5}
          maxLength={800}
          rows={3}
          onChange={() => setNonce(crypto.randomUUID())}
          placeholder="بدون کپی اطلاعات سلامت یا تماس…"
        />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "ثبت ارجاع"}
      </button>
    </form>
  );
}

function LinkForm({ ticketId, seed }: { ticketId: string; seed: string }) {
  const [state, action, pending] = useActionState(
    linkConversationReference,
    initialConversationActionState,
  );
  const [nonce, setNonce] = useState(seed);
  return (
    <form action={action} className={styles.operationCard} aria-busy={pending}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="idempotencyKey" value={`support-link:${nonce}`} />
      <strong>اتصال Issue / Incident</strong>
      <label>
        <span>نوع مرجع</span>
        <select
          name="linkKind"
          defaultValue="ProductIssue"
          onChange={() => setNonce(crypto.randomUUID())}
        >
          <option value="ProductIssue">Product Issue</option>
          <option value="EngineeringIssue">Engineering Issue</option>
          <option value="Incident">Incident</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label>
        <span>شناسه داخلی</span>
        <input
          name="referenceCode"
          required
          maxLength={180}
          onChange={() => setNonce(crypto.randomUUID())}
          placeholder="CORE-569 یا GH#569 — URL وارد نکنید"
        />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending}>
        {pending ? "در حال ثبت…" : "اتصال مرجع"}
      </button>
    </form>
  );
}

export function SupportConversationPanel({
  ticketId,
  canWrite,
  messages,
  escalations,
  links,
  requestSeed,
}: Props) {
  const ordered = [...messages].reverse();
  return (
    <section className={styles.workspace} aria-labelledby="support-conversation-title">
      <header className={styles.heading}>
        <div>
          <span>Support conversation</span>
          <h3 id="support-conversation-title">گفتگوی پشتیبانی</h3>
          <p>پیام‌های واقعی API با polling/refresh؛ این صفحه ادعای realtime transport نمی‌کند.</p>
        </div>
        <span className={styles.badge}>{messages.length.toLocaleString("fa-IR")} پیام</span>
      </header>
      <div className={styles.messageList} aria-live="polite">
        {ordered.length === 0 ? (
          <p className={styles.empty}>هنوز پیامی در این گفتگو ثبت نشده است.</p>
        ) : (
          ordered.map((message) => (
            <article
              className={styles.message}
              data-sender={message.senderKind}
              key={message.messageId}
            >
              <header>
                <strong>
                  {message.senderDisplayName ||
                    (message.senderKind === "Staff" ? "تیم LifeMate" : "کاربر")}
                </strong>
                <time dateTime={message.createdAtUtc}>{formatDateTime(message.createdAtUtc)}</time>
              </header>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>
      {canWrite ? (
        <MessageComposer ticketId={ticketId} seed={requestSeed} />
      ) : (
        <p className={styles.readOnly}>برای پاسخ به کاربر مجوز support.write لازم است.</p>
      )}
      <div className={styles.operationsGrid}>
        <div className={styles.operationHistory}>
          <strong>ارجاع‌ها</strong>
          {escalations.length === 0 ? (
            <span>ارجاعی ثبت نشده</span>
          ) : (
            escalations.map((item) => (
              <div key={item.escalationId}>
                <b>{item.targetRoleName}</b>
                <span>
                  {item.status} · {formatDateTime(item.createdAtUtc)}
                </span>
                <small>{item.safeReason}</small>
              </div>
            ))
          )}
        </div>
        <div className={styles.operationHistory}>
          <strong>مراجع داخلی</strong>
          {links.length === 0 ? (
            <span>مرجعی ثبت نشده</span>
          ) : (
            links.map((item) => (
              <div key={item.linkId}>
                <b>{item.linkKind}</b>
                <code>{item.referenceCode}</code>
                <span>{formatDateTime(item.createdAtUtc)}</span>
              </div>
            ))
          )}
        </div>
      </div>
      {canWrite ? (
        <div className={styles.formsGrid}>
          <EscalationForm ticketId={ticketId} seed={`${requestSeed}:escalation`} />
          <LinkForm ticketId={ticketId} seed={`${requestSeed}:link`} />
        </div>
      ) : null}
      <aside className={styles.attachmentNotice}>
        ضمیمه‌ها فقط پس از وجود قرارداد signed-access در Core نمایش داده می‌شوند؛ این UI هرگز public
        bucket URL یا مسیر Storage مستقیم نمی‌سازد.
      </aside>
    </section>
  );
}
