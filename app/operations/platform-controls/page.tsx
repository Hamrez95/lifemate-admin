import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getPlatformControl,
  getPlatformControlHistory,
  getPlatformControls,
} from "@/src/lib/admin-api/platform-controls";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  createControlAction,
  createRuleAction,
  killSwitchControlAction,
  rollbackControlAction,
  updateControlAction,
  updateRuleAction,
} from "./actions";
import styles from "./platform-controls.module.css";

type Props = { searchParams: Promise<{ control?: string }> };

function displayValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export default async function PlatformControlsPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("platform.config.read")) redirect("/forbidden");
  const canWrite = admin.permissions.includes("platform.config.write");
  const { control: selectedKey } = await searchParams;

  const listResult = await getPlatformControls();
  if (listResult.kind === "unauthenticated") redirect("/login");
  if (listResult.kind === "forbidden") redirect("/forbidden");
  const controls = listResult.kind === "ok" ? listResult.data.items : [];
  const key = selectedKey && controls.some((item) => item.key === selectedKey) ? selectedKey : controls[0]?.key;
  const [detailResult, historyResult] = key
    ? await Promise.all([getPlatformControl(key), getPlatformControlHistory(key)])
    : [null, null];
  const detail = detailResult?.kind === "ok" ? detailResult.data : null;
  const history = historyResult?.kind === "ok" ? historyResult.data : null;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="operations"
        title="Platform Controls"
        subtitle="Server-authoritative Remote Config, Feature Flags and staged rollouts"
      >
        <main className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span>Control Plane · P0</span>
              <h2>Feature Flags و Remote Config با مرز دسترسی صریح</h2>
              <p>
                این کنترل‌ها فقط رفتار و presentation را تغییر می‌دهند. هیچ flag یا rollout در client
                نمی‌تواند Permission یا Entitlement ایجاد کند؛ authorization همچنان server-authoritative است.
              </p>
            </div>
            <Link href="/operations/releases">Release controls →</Link>
          </section>

          {listResult.kind !== "ok" ? (
            <section className={styles.panel}>
              <h3>Platform Controls unavailable</h3>
              <p>داده جایگزین یا direct browser DB path ساخته نمی‌شود.</p>
            </section>
          ) : (
            <div className={styles.workspace}>
              <aside className={styles.list} aria-label="Platform control list">
                <header>
                  <strong>Controls</strong>
                  <small>{controls.length.toLocaleString("fa-IR")}</small>
                </header>
                {controls.map((item) => (
                  <Link
                    className={item.key === key ? styles.activeItem : styles.item}
                    href={`/operations/platform-controls?control=${encodeURIComponent(item.key)}`}
                    key={item.key}
                  >
                    <span>{item.key}</span>
                    <small>
                      {item.kind} · v{item.version}
                    </small>
                  </Link>
                ))}
              </aside>

              <div className={styles.detail}>
                {detail ? (
                  <>
                    <section className={styles.panel}>
                      <header className={styles.panelHeader}>
                        <div>
                          <span>{detail.definition.kind}</span>
                          <h3>{detail.key}</h3>
                        </div>
                        <b>{detail.definition.status}</b>
                      </header>
                      <div className={styles.securityNotice}>
                        Server authoritative · grantsPermission=false · grantsEntitlement=false
                      </div>
                      <dl className={styles.metrics}>
                        <div>
                          <dt>Type</dt>
                          <dd>{detail.definition.valueType}</dd>
                        </div>
                        <div>
                          <dt>Version</dt>
                          <dd>{detail.definition.version}</dd>
                        </div>
                        <div>
                          <dt>Fail closed</dt>
                          <dd>{detail.definition.failClosed ? "Yes" : "No"}</dd>
                        </div>
                        <div>
                          <dt>Rules</dt>
                          <dd>{detail.rules.length}</dd>
                        </div>
                      </dl>

                      {canWrite ? (
                        <form action={updateControlAction} className={styles.form}>
                          <input type="hidden" name="controlKey" value={detail.key} />
                          <input type="hidden" name="expectedVersion" value={detail.definition.version} />
                          <input type="hidden" name="valueType" value={detail.definition.valueType} />
                          <label>
                            Default value
                            <textarea name="defaultValue" defaultValue={displayValue(detail.definition.defaultValue)} required />
                          </label>
                          <label>
                            Description
                            <textarea name="description" defaultValue={detail.definition.description} minLength={5} maxLength={240} required />
                          </label>
                          <div className={styles.row}>
                            <label>
                              Status
                              <select name="status" defaultValue={detail.definition.status}>
                                <option value="Active">Active</option>
                                <option value="Retired">Retired</option>
                              </select>
                            </label>
                            <label className={styles.check}>
                              <input type="checkbox" name="failClosed" defaultChecked={detail.definition.failClosed} />
                              Fail closed
                            </label>
                          </div>
                          <label>
                            Audit reason
                            <input name="reason" minLength={10} maxLength={1000} required />
                          </label>
                          <button type="submit">Save optimistic update</button>
                        </form>
                      ) : null}
                    </section>

                    <section className={styles.panel}>
                      <header className={styles.panelHeader}>
                        <div>
                          <span>Staged rollout</span>
                          <h3>Rules</h3>
                        </div>
                      </header>
                      <div className={styles.rules}>
                        {detail.rules.length === 0 ? <p>هیچ rollout rule فعالی ثبت نشده است.</p> : null}
                        {detail.rules.map((rule) => (
                          <article key={rule.id} className={styles.rule}>
                            <header>
                              <strong>{rule.targetType}</strong>
                              <span>priority {rule.priority} · v{rule.version}</span>
                            </header>
                            <div className={styles.rolloutBar}>
                              <i style={{ width: `${rule.targetType === "Percentage" ? (rule.rolloutBasisPoints ?? 0) / 100 : 100}%` }} />
                            </div>
                            <small>
                              target: {rule.targetKey ?? "global"} · value: {displayValue(rule.value)}
                            </small>
                            {canWrite ? (
                              <form action={updateRuleAction} className={styles.compactForm}>
                                <input type="hidden" name="ruleId" value={rule.id} />
                                <input type="hidden" name="expectedVersion" value={rule.version} />
                                <input type="hidden" name="valueType" value={detail.definition.valueType} />
                                <input name="priority" type="number" min={1} max={10000} defaultValue={rule.priority} required />
                                <select name="targetType" defaultValue={rule.targetType}>
                                  {['Global','Product','Segment','Percentage','Beta','Account'].map((value) => <option key={value} value={value}>{value}</option>)}
                                </select>
                                <input name="targetKey" defaultValue={rule.targetKey ?? ""} placeholder="opaque target key" />
                                <input name="rolloutBasisPoints" type="number" min={0} max={10000} defaultValue={rule.rolloutBasisPoints ?? ""} placeholder="basis points" />
                                <input name="value" defaultValue={displayValue(rule.value)} required />
                                <input name="startsAtUtc" defaultValue={rule.startsAtUtc ?? ""} placeholder="ISO start" />
                                <input name="endsAtUtc" defaultValue={rule.endsAtUtc ?? ""} placeholder="ISO end" />
                                <select name="status" defaultValue="Active">
                                  <option value="Active">Active</option>
                                  <option value="Disabled">Disabled</option>
                                  <option value="Retired">Retired</option>
                                </select>
                                <input name="reason" minLength={10} maxLength={1000} placeholder="Audit reason" required />
                                <button type="submit">Update rule</button>
                              </form>
                            ) : null}
                          </article>
                        ))}
                      </div>

                      {canWrite ? (
                        <form action={createRuleAction} className={styles.form}>
                          <h4>Add rollout rule</h4>
                          <input type="hidden" name="controlKey" value={detail.key} />
                          <input type="hidden" name="valueType" value={detail.definition.valueType} />
                          <div className={styles.row}>
                            <label>Priority<input name="priority" type="number" min={1} max={10000} defaultValue={100} required /></label>
                            <label>Target<select name="targetType" defaultValue="Global">{['Global','Product','Segment','Percentage','Beta','Account'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                          </div>
                          <input name="targetKey" placeholder="product / segment / beta / opaque account key" />
                          <input name="rolloutBasisPoints" type="number" min={0} max={10000} placeholder="Percentage only: 0–10000 bp" />
                          <input name="value" placeholder="Typed value" required />
                          <div className={styles.row}>
                            <input name="startsAtUtc" placeholder="Optional ISO start" />
                            <input name="endsAtUtc" placeholder="Optional ISO end" />
                          </div>
                          <select name="status" defaultValue="Active"><option value="Active">Active</option><option value="Disabled">Disabled</option><option value="Retired">Retired</option></select>
                          <input name="reason" minLength={10} maxLength={1000} placeholder="Audit reason" required />
                          <button type="submit">Create rule</button>
                        </form>
                      ) : null}
                    </section>

                    {canWrite ? (
                      <section className={styles.dangerPanel}>
                        <h3>Rollback / Kill switch</h3>
                        <p>هر دو action version-checked، idempotent و audited هستند. Kill switch فقط برای Boolean FeatureFlag معتبر است.</p>
                        <div className={styles.actionGrid}>
                          <form action={rollbackControlAction} className={styles.form}>
                            <input type="hidden" name="controlKey" value={detail.key} />
                            <input type="hidden" name="expectedVersion" value={detail.definition.version} />
                            <label>History version<input name="historyVersion" type="number" min={1} required /></label>
                            <label>Reason<input name="reason" minLength={10} maxLength={1000} required /></label>
                            <button type="submit">Rollback</button>
                          </form>
                          <form action={killSwitchControlAction} className={styles.form}>
                            <input type="hidden" name="controlKey" value={detail.key} />
                            <input type="hidden" name="expectedVersion" value={detail.definition.version} />
                            <label>Reason<input name="reason" minLength={10} maxLength={1000} required /></label>
                            <button type="submit" disabled={detail.definition.kind !== "FeatureFlag" || detail.definition.valueType !== "Boolean"}>Activate kill switch</button>
                          </form>
                        </div>
                      </section>
                    ) : null}

                    <section className={styles.panel}>
                      <h3>History</h3>
                      {history ? (
                        <ul className={styles.history}>
                          {history.controlHistory.map((item) => (
                            <li key={item.version}>
                              <b>v{item.version}</b>
                              <span>{new Date(item.archived_at_utc).toLocaleString("fa-IR")}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>History unavailable; synthetic history is not generated.</p>
                      )}
                    </section>
                  </>
                ) : (
                  <section className={styles.panel}><p>Control detail unavailable; fake runtime data is not generated.</p></section>
                )}
              </div>
            </div>
          )}

          {canWrite ? (
            <section className={styles.panel}>
              <h3>Create typed control</h3>
              <form action={createControlAction} className={styles.form}>
                <div className={styles.row}>
                  <label>Key<input name="controlKey" pattern="[a-z][a-z0-9._-]{2,95}" required /></label>
                  <label>Kind<select name="controlKind" defaultValue="FeatureFlag"><option value="FeatureFlag">FeatureFlag</option><option value="Config">Config</option></select></label>
                  <label>Value type<select name="valueType" defaultValue="Boolean"><option value="Boolean">Boolean</option><option value="Integer">Integer</option><option value="String">String</option><option value="Json">Json</option></select></label>
                </div>
                <label>Default value<textarea name="defaultValue" defaultValue="false" required /></label>
                <label>Description<textarea name="description" minLength={5} maxLength={240} required /></label>
                <label className={styles.check}><input type="checkbox" name="failClosed" />Fail closed</label>
                <label>Audit reason<input name="reason" minLength={10} maxLength={1000} required /></label>
                <button type="submit">Create control</button>
              </form>
            </section>
          ) : null}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
