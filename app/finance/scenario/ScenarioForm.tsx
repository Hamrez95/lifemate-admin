"use client";

import { useActionState, useState } from "react";

import type { FinanceScenario } from "@/src/lib/admin-api/finance-scenarios";

import styles from "../finance.module.css";
import { initialScenarioActionState, saveScenarioAction } from "./actions";

const defaultAssumptions = JSON.stringify(
  [
    {
      code: "REVENUE_CORE",
      label: "Core revenue",
      amountMinor: "0",
      classification: "FORECAST",
    },
  ],
  null,
  2,
);

export function ScenarioForm({
  scenario,
  canWrite,
}: {
  scenario: FinanceScenario | null;
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(saveScenarioAction, initialScenarioActionState);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());

  return (
    <form
      action={action}
      className={styles.scenarioForm}
      onChange={() => setRequestKey(crypto.randomUUID())}
      aria-labelledby="scenario-form-title"
    >
      <input type="hidden" name="scenarioId" value={scenario?.scenarioId ?? ""} />
      <input type="hidden" name="expectedVersion" value={scenario?.version ?? ""} />
      <input type="hidden" name="idempotencyKey" value={requestKey} />
      <input type="hidden" name="confirmation" value="confirm-finance-scenario" />

      <div className={styles.scenarioFormGrid}>
        <label className={styles.filterField}>
          <span>نوع سناریو</span>
          <select
            name="scenarioKind"
            defaultValue={scenario?.scenarioKind ?? "BASE"}
            disabled={!canWrite || pending}
          >
            <option value="BASE">BASE</option>
            <option value="UPSIDE">UPSIDE</option>
            <option value="DOWNSIDE">DOWNSIDE</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span>نام</span>
          <input
            name="name"
            defaultValue={scenario?.name ?? ""}
            required
            maxLength={120}
            disabled={!canWrite || pending}
          />
        </label>
        <label className={styles.filterField}>
          <span>Currency</span>
          <input
            name="currency"
            dir="ltr"
            defaultValue={scenario?.currency ?? "USD"}
            pattern="[A-Za-z]{3}"
            required
            readOnly={Boolean(scenario)}
            disabled={!canWrite || pending}
            aria-describedby="currency-note"
          />
        </label>
        <label className={styles.filterField}>
          <span>شروع</span>
          <input
            name="validFrom"
            type="date"
            defaultValue={scenario?.validFrom ?? ""}
            required
            disabled={!canWrite || pending}
          />
        </label>
        <label className={styles.filterField}>
          <span>پایان</span>
          <input
            name="validTo"
            type="date"
            defaultValue={scenario?.validTo ?? ""}
            required
            disabled={!canWrite || pending}
          />
        </label>
      </div>

      <p id="currency-note" className={styles.footnote}>
        Currency در نسخه‌های موجود immutable است؛ تبدیل FX ضمنی انجام نمی‌شود.
      </p>

      <label className={styles.scenarioTextareaField}>
        <span>Assumptions canonical JSON</span>
        <textarea
          name="assumptions"
          dir="ltr"
          rows={10}
          defaultValue={JSON.stringify(scenario?.assumptions ?? JSON.parse(defaultAssumptions), null, 2)}
          required
          disabled={!canWrite || pending}
          spellCheck={false}
        />
        <small>
          هر ردیف فقط code، label، amountMinor به‌صورت integer string و classification از نوع BUDGET یا FORECAST دارد.
        </small>
      </label>

      <label className={styles.scenarioTextareaField}>
        <span>دلیل تغییر</span>
        <textarea
          name="reason"
          rows={3}
          required
          minLength={10}
          maxLength={1000}
          disabled={!canWrite || pending}
        />
      </label>

      <div className={styles.filterActions} aria-live="polite">
        <button type="submit" disabled={!canWrite || pending}>
          {pending ? "در حال ثبت امن…" : scenario ? "ثبت نسخه جدید" : "ایجاد سناریو"}
        </button>
        <span>{state.message ?? (canWrite ? "ثبت با reason، idempotency، version و audit" : "فقط خواندنی")}</span>
      </div>
    </form>
  );
}
