import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getProductUpdatePolicies,
  getProductUpdatePolicyHistory,
  getProductVersionAdoption,
} from "@/src/lib/admin-api/product-release";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { saveProductUpdatePolicyAction } from "./actions";
import styles from "./releases.module.css";

type Props = { searchParams: Promise<{ status?: string }> };

function notice(status?: string) {
  if (status === "saved") return "سیاست به‌صورت versioned و audited ثبت شد.";
  if (status === "conflict")
    return "نسخه سیاست تغییر کرده است؛ صفحه را تازه کنید و دوباره بررسی کنید.";
  if (status === "forbidden") return "مجوز تغییر Update Policy وجود ندارد.";
  if (status === "invalid") return "ورودی سیاست معتبر نیست.";
  if (status === "unavailable")
    return "Admin API در دسترس نیست؛ هیچ fallback مستقیمی به دیتابیس انجام نشد.";
  return null;
}

export default async function ReleaseAdoptionPage({ searchParams }: Props) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("analytics.product_versions.read")) redirect("/forbidden");

  const [adoption, policies, history] = await Promise.all([
    getProductVersionAdoption(),
    getProductUpdatePolicies(),
    getProductUpdatePolicyHistory(),
  ]);
  if (
    adoption.kind === "unauthenticated" ||
    policies.kind === "unauthenticated" ||
    history.kind === "unauthenticated"
  ) {
    redirect("/login");
  }
  if (
    adoption.kind === "forbidden" ||
    policies.kind === "forbidden" ||
    history.kind === "forbidden"
  ) {
    redirect("/forbidden");
  }

  const params = await searchParams;
  const message = notice(params.status);
  const canWrite = admin.permissions.includes("platform.update_policy.write");
  const adoptionItems = adoption.kind === "ok" ? adoption.data.items : [];
  const policyItems = policies.kind === "ok" ? policies.data.items : [];
  const historyItems = history.kind === "ok" ? history.data.items : [];
  const accountTotal = adoptionItems.reduce((sum, item) => sum + item.accountCount, 0);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="operations"
        title="Release Adoption & Update Policy"
        subtitle="Version adoption, minimum support and server-authoritative update controls"
      >
        <main className={styles.page}>
          {message ? <div className={styles.notice}>{message}</div> : null}
          <section className={styles.hero}>
            <div>
              <span>Product Operations</span>
              <h2>انتشار نسخه بدون حدس و بدون client-side override</h2>
              <p>
                Adoption از telemetry canonical خوانده می‌شود. Soft حالت عادی است و Force فقط برای
                Critical، Security یا Breaking Compatibility قابل ثبت است.
              </p>
            </div>
            <Link href="/marketing/campaigns">Targeted update campaign →</Link>
          </section>

          <section className={styles.metrics} aria-label="Release adoption summary">
            <article>
              <strong>{adoptionItems.length.toLocaleString("fa-IR")}</strong>
              <span>Version buckets</span>
            </article>
            <article>
              <strong>{accountTotal.toLocaleString("fa-IR")}</strong>
              <span>Account observations</span>
            </article>
            <article>
              <strong>
                {policyItems
                  .filter((item) => item.mode === "Force" && item.status === "Active")
                  .length.toLocaleString("fa-IR")}
              </strong>
              <span>Active Force policies</span>
            </article>
          </section>

          <section className={styles.panel}>
            <header>
              <div>
                <span>Adoption</span>
                <h3>Product / Platform / Version</h3>
              </div>
              <b>Canonical telemetry</b>
            </header>
            {adoption.kind === "ok" ? (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Platform</th>
                      <th>Version</th>
                      <th>Build</th>
                      <th>Accounts</th>
                      <th>Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adoptionItems.map((item) => (
                      <tr
                        key={`${item.product}-${item.platform}-${item.appVersion}-${item.buildNumber}`}
                      >
                        <td>{item.product}</td>
                        <td>{item.platform}</td>
                        <td>{item.appVersion}</td>
                        <td>{item.buildNumber}</td>
                        <td>{item.accountCount.toLocaleString("fa-IR")}</td>
                        <td>{new Date(item.lastSeenAtUtc).toLocaleString("fa-IR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.muted}>
                Adoption API unavailable؛ داده ساختگی نمایش داده نمی‌شود.
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <header>
              <div>
                <span>Server policy</span>
                <h3>Minimum supported / recommended versions</h3>
              </div>
              <b>{canWrite ? "Editable" : "Read only"}</b>
            </header>
            <div className={styles.cards}>
              {policyItems.map((policy) => (
                <article className={styles.card} key={`${policy.product}-${policy.platform}`}>
                  <div className={styles.cardTitle}>
                    <strong>
                      {policy.product} · {policy.platform}
                    </strong>
                    <span>
                      {policy.mode} · v{policy.policyVersion}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>Minimum</dt>
                      <dd>{policy.minimumSupportedVersion}</dd>
                    </div>
                    <div>
                      <dt>Recommended</dt>
                      <dd>{policy.recommendedVersion ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Reason</dt>
                      <dd>{policy.reasonCode}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{policy.status}</dd>
                    </div>
                  </dl>
                  {canWrite ? (
                    <form action={saveProductUpdatePolicyAction} className={styles.form}>
                      <input type="hidden" name="product" value={policy.product} />
                      <input type="hidden" name="platform" value={policy.platform} />
                      <input type="hidden" name="expectedVersion" value={policy.policyVersion} />
                      <input
                        type="hidden"
                        name="idempotencyKey"
                        value={`update-policy-${randomUUID()}`}
                      />
                      <label>
                        Minimum
                        <input
                          name="minimumSupportedVersion"
                          defaultValue={policy.minimumSupportedVersion}
                          required
                        />
                      </label>
                      <label>
                        Recommended
                        <input
                          name="recommendedVersion"
                          defaultValue={policy.recommendedVersion ?? ""}
                        />
                      </label>
                      <label>
                        Mode
                        <select name="mode" defaultValue={policy.mode}>
                          <option value="Soft">Soft</option>
                          <option value="Force">Force</option>
                        </select>
                      </label>
                      <label>
                        Reason code
                        <select name="reasonCode" defaultValue={policy.reasonCode}>
                          <option value="Routine">Routine</option>
                          <option value="Critical">Critical</option>
                          <option value="Security">Security</option>
                          <option value="BreakingCompatibility">BreakingCompatibility</option>
                        </select>
                      </label>
                      <label>
                        Status
                        <select name="status" defaultValue={policy.status}>
                          <option value="Active">Active</option>
                          <option value="Disabled">Disabled</option>
                        </select>
                      </label>
                      <label>
                        Message key
                        <input name="messageKey" defaultValue={policy.messageKey ?? ""} />
                      </label>
                      <label>
                        Effective at
                        <input
                          type="datetime-local"
                          name="effectiveAtUtc"
                          defaultValue={new Date(policy.effectiveAtUtc).toISOString().slice(0, 16)}
                          required
                        />
                      </label>
                      <label className={styles.wide}>
                        Reason
                        <textarea name="reason" minLength={10} maxLength={1000} required />
                      </label>
                      <button type="submit">Save new policy version</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <header>
              <div>
                <span>Immutable history</span>
                <h3>Archived policy versions</h3>
              </div>
              <b>Read only</b>
            </header>
            {history.kind === "ok" ? (
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Platform</th>
                      <th>Version</th>
                      <th>Minimum</th>
                      <th>Recommended</th>
                      <th>Mode</th>
                      <th>Reason</th>
                      <th>Archived</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((item) => (
                      <tr key={`${item.product}-${item.platform}-${item.policyVersion}`}>
                        <td>{item.product}</td>
                        <td>{item.platform}</td>
                        <td>{item.policyVersion}</td>
                        <td>{item.minimumSupportedVersion ?? "—"}</td>
                        <td>{item.recommendedVersion ?? "—"}</td>
                        <td>{item.mode ?? "—"}</td>
                        <td>{item.reasonCode ?? "—"}</td>
                        <td>{new Date(item.archivedAtUtc).toLocaleString("fa-IR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.muted}>
                History API unavailable؛ تاریخچه محلی یا ساختگی جایگزین نمی‌شود.
              </p>
            )}
          </section>
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
