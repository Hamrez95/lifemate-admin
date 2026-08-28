import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getPreferencePurposePolicies } from "@/src/lib/admin-api/privacy-preference-policies";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { updatePreferencePurposeAction } from "./actions";
import styles from "./preference-purposes.module.css";

export default async function PreferencePurposePolicyPage() {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("privacy.consent.read")) redirect("/forbidden");

  const result = await getPreferencePurposePolicies(new URLSearchParams({ pageSize: "100" }));
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") redirect("/forbidden");

  const canManage = admin.permissions.includes("privacy.consent.manage");
  const items = result.kind === "ok" ? result.data.items : [];

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="privacy"
        title="Preference Purpose Policies"
        subtitle="Canonical policy metadata; user opt-in remains user-controlled"
      >
        <main className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span>Privacy Control Plane</span>
              <h2>سیاست Preference بدون دست‌کاری رضایت کاربر</h2>
              <p>
                این صفحه فقط policy row را مدیریت می‌کند. تغییر policy هرگز به معنی Opt-in کاربر یا
                پذیرش Terms نیست و timestamp همین policy برای optimistic concurrency استفاده می‌شود.
              </p>
            </div>
            <Link href="/privacy">← بازگشت به Privacy Center</Link>
          </section>

          {result.kind !== "ok" ? (
            <section className={styles.panel}>
              <h3>Policy directory unavailable</h3>
              <p>داده جایگزین یا دسترسی مستقیم به دیتابیس ساخته نمی‌شود.</p>
            </section>
          ) : items.length === 0 ? (
            <section className={styles.panel}>
              <h3>هیچ Preference Purpose ثبت نشده است.</h3>
            </section>
          ) : (
            <section className={styles.grid} aria-label="Preference purpose policies">
              {items.map((item) => (
                <article className={styles.card} key={item.purpose}>
                  <header>
                    <div>
                      <span>{item.category}</span>
                      <h3>{item.purpose}</h3>
                    </div>
                    <b data-status={item.status}>{item.status}</b>
                  </header>

                  <dl>
                    <div>
                      <dt>Channel</dt>
                      <dd>{item.channel ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Default</dt>
                      <dd>{item.defaultEnabled ? "Enabled" : "Disabled"}</dd>
                    </div>
                    <div>
                      <dt>User mutable</dt>
                      <dd>{item.userMutable ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt>Policy version</dt>
                      <dd>{item.policyVersion}</dd>
                    </div>
                  </dl>

                  {canManage ? (
                    <form action={updatePreferencePurposeAction} className={styles.form}>
                      <input type="hidden" name="purpose" value={item.purpose} />
                      <input type="hidden" name="expectedUpdatedAt" value={item.updatedAtUtc} />
                      <label>
                        Description
                        <textarea
                          name="description"
                          defaultValue={item.description}
                          minLength={3}
                          maxLength={240}
                          required
                        />
                      </label>
                      <label>
                        Policy version
                        <input
                          name="policyVersion"
                          defaultValue={item.policyVersion}
                          pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,63}"
                          maxLength={64}
                          required
                        />
                      </label>
                      <label>
                        Status
                        <select name="status" defaultValue={item.status}>
                          <option value="Active">Active</option>
                          <option value="Retired">Retired</option>
                        </select>
                      </label>
                      <input type="hidden" name="reasonCode" value="policy_admin_update" />
                      <button type="submit">ذخیره نسخه policy</button>
                    </form>
                  ) : (
                    <p className={styles.readOnly}>Read only — privacy.consent.manage لازم است.</p>
                  )}
                  <small>Updated: {new Date(item.updatedAtUtc).toLocaleString("fa-IR")}</small>
                </article>
              ))}
            </section>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
