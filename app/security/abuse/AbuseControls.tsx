"use client";

import { useActionState, useMemo, useState } from "react";

import type { AbuseRule } from "@/src/lib/admin-api/abuse-rules";

import {
  initialAbuseActionState,
  retireAbuseRuleAction,
  upsertAbuseRuleAction,
} from "./actions";
import styles from "./abuse.module.css";

function newKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function Message({ status, message }: { status: string; message?: string }) {
  if (!message) return null;
  return <p className={styles.message} data-status={status} role="status">{message}</p>;
}

export function AbuseRuleForm({ canWrite }: { canWrite: boolean }) {
  const [state, action, pending] = useActionState(upsertAbuseRuleAction, initialAbuseActionState);
  const [idempotencyKey] = useState(() => newKey("abuse-rule"));
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="confirmation" value="confirm-abuse-rule" />
      <label>Code<input name="code" required placeholder="gift.daily_limit" /></label>
      <label>Context<input name="contextCode" required placeholder="gift" /></label>
      <label className={styles.wide}>Display name<input name="displayName" required minLength={2} maxLength={160} /></label>
      <label>Rule kind<select name="ruleKind" defaultValue="VelocityLimit"><option>VelocityLimit</option><option>UsageCap</option><option>Cooldown</option><option>DuplicateKey</option><option>EvidenceRequired</option></select></label>
      <label>Subject scope<select name="subjectScope" defaultValue="Account"><option>Account</option><option>VerifiedPhone</option></select></label>
      <label>Action<select name="enforcementAction" defaultValue="RequireApproval"><option>Allow</option><option>Deny</option><option>RequireApproval</option></select></label>
      <label>Priority<input name="priority" type="number" min={1} max={10000} defaultValue={100} /></label>
      <label>Window seconds<input name="windowSeconds" type="number" min={1} max={31536000} /></label>
      <label>Max count<input name="maxCount" type="number" min={1} max={1000000} /></label>
      <label>Cooldown seconds<input name="cooldownSeconds" type="number" min={1} max={31536000} /></label>
      <label>Evidence code<input name="evidenceCode" placeholder="verified_evidence" /></label>
      <label>Approval request type<input name="approvalRequestType" placeholder="manual_review" /></label>
      <label>Expected version<input name="expectedVersion" type="number" min={1} placeholder="برای create خالی" /></label>
      <label className={styles.wide}>Reason<textarea name="reason" required minLength={10} maxLength={1000} rows={3} /></label>
      <div className={styles.footer}><button disabled={!canWrite || pending}>{pending ? "در حال ثبت…" : "ذخیره Rule"}</button><span>Rule باید explainable باشد؛ black-box score در v1 وجود ندارد.</span></div>
      <Message status={state.status} message={state.message} />
    </form>
  );
}

export function RetireRuleForm({ rule, canWrite }: { rule: AbuseRule; canWrite: boolean }) {
  const [state, action, pending] = useActionState(retireAbuseRuleAction, initialAbuseActionState);
  const idempotencyKey = useMemo(() => newKey(`abuse-retire:${rule.id}`), [rule.id]);
  if (rule.status === "Retired") return null;
  return (
    <form action={action} className={styles.retireForm}>
      <input type="hidden" name="ruleId" value={rule.id} />
      <input type="hidden" name="expectedVersion" value={rule.version} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="confirmation" value="confirm-abuse-rule-retire" />
      <input name="reason" required minLength={10} maxLength={1000} placeholder="دلیل retire" />
      <button disabled={!canWrite || pending}>{pending ? "…" : "Retire"}</button>
      <Message status={state.status} message={state.message} />
    </form>
  );
}
