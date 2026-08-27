import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import { getGrowthRewardsSnapshot } from "@/src/lib/admin-api/growth-rewards";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { CommerceWorkspaceHeader, CoreDependencyNotice } from "../CommerceWorkspaceHeader";
import { RewardRuleForm, RewardSourceReviewForm } from "./GrowthRewardControls";
import styles from "./rewards.module.css";

const formatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tehran",
});

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : formatter.format(parsed);
}

export default async function GrowthRewardsPage() {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("growth.rewards.read");
  const canWrite = admin.permissions.includes("growth.rewards.write");
  if (!canRead && !canWrite) redirect("/forbidden");

  const snapshot = canRead ? await getGrowthRewardsSnapshot() : null;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="commerce"
        title="Gift / Referral / Advocacy"
        subtitle="Rule-based rewards · reviewable evidence · anti-abuse aware"
      >
        <main className={styles.page} dir="rtl">
          <CommerceWorkspaceHeader
            active="rewards"
            eyebrow="Core #494 · Admin #183"
            title="Growth Rewards"
            description="Referral، Advocacy، Gift و Campaign rewardها فقط از قرارداد canonical Core مدیریت می‌شوند؛ هیچ social scraping یا reward ساختگی وجود ندارد."
          />

          {!canRead ? (
            <CoreDependencyNotice title="Read access محدود است" tone="info">
              permission: growth.rewards.read برای مشاهده ruleها و review queue لازم است.
            </CoreDependencyNotice>
          ) : snapshot?.access === "forbidden" ? (
            <AdminPageState state="forbidden" title="Core دسترسی Growth Rewards را رد کرد" />
          ) : snapshot?.access === "unavailable" ? (
            <AdminPageState
              state="unavailable"
              title="Growth Rewards فعلاً در دسترس نیست"
              description="داده جایگزین یا reward فرضی ساخته نمی‌شود."
            />
          ) : null}

          {canWrite ? (
            <section className={styles.panel}>
              <header>
                <span>Rule management</span>
                <h3>تعریف یا ویرایش Reward Rule</h3>
                <p>
                  برای update، version فعلی rule را وارد کنید؛ create با expectedVersion=0 انجام
                  می‌شود.
                </p>
              </header>
              <RewardRuleForm />
            </section>
          ) : null}

          {snapshot?.access === "ready" ? (
            <>
              <section className={styles.grid}>
                <article className={styles.panel}>
                  <header>
                    <span>Rules</span>
                    <h3>Reward Ruleها</h3>
                  </header>
                  {snapshot.rules?.length ? (
                    <div className={styles.list}>
                      {snapshot.rules.map((rule) => (
                        <div className={styles.item} key={rule.id}>
                          <div>
                            <strong>{rule.code}</strong>
                            <small>
                              {rule.triggerKind} → {rule.rewardKind}
                            </small>
                          </div>
                          <div className={styles.meta}>
                            <span>{rule.status}</span>
                            <span>v{rule.version}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminPageState state="empty" title="Reward Rule ثبت نشده است" />
                  )}
                </article>

                <article className={styles.panel}>
                  <header>
                    <span>Events</span>
                    <h3>Reward Events</h3>
                  </header>
                  {snapshot.events?.length ? (
                    <div className={styles.list}>
                      {snapshot.events.map((event) => (
                        <div className={styles.item} key={event.id}>
                          <div>
                            <strong>{event.rewardKind}</strong>
                            <small>
                              {event.sourceKind} · {date(event.createdAtUtc)}
                            </small>
                          </div>
                          <div className={styles.meta}>
                            <span>{event.status}</span>
                            {event.approvalRequestId ? <span>Approval-linked</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AdminPageState state="empty" title="Reward Event ثبت نشده است" />
                  )}
                </article>
              </section>

              <section className={styles.grid}>
                {(["Referral", "Advocacy"] as const).map((kind) => {
                  const items = kind === "Referral" ? snapshot.referrals : snapshot.advocacy;
                  return (
                    <article className={styles.panel} key={kind}>
                      <header>
                        <span>Review queue</span>
                        <h3>{kind}</h3>
                        <p>
                          فقط evidence ثبت‌شده در Core review می‌شود؛ private profile scraping وجود
                          ندارد.
                        </p>
                      </header>
                      {items?.length ? (
                        <div className={styles.list}>
                          {items.map((item) => (
                            <div className={styles.source} key={item.id}>
                              <div className={styles.item}>
                                <div>
                                  <strong>{item.status}</strong>
                                  <small>{date(item.occurredAtUtc)}</small>
                                  {item.platformCode ? (
                                    <small>
                                      {item.platformCode} · {item.evidenceType}
                                    </small>
                                  ) : null}
                                </div>
                                <span className={styles.version}>v{item.version}</span>
                              </div>
                              {canWrite ? (
                                <RewardSourceReviewForm
                                  kind={kind}
                                  sourceId={item.id}
                                  version={item.version}
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <AdminPageState state="empty" title={`${kind} مورد انتظار review ندارد`} />
                      )}
                    </article>
                  );
                })}
              </section>

              <footer className={styles.footer}>
                As of {date(snapshot.asOfUtc)} · reward fulfillment همچنان approval/abuse policy را
                در Core enforce می‌کند.
              </footer>
            </>
          ) : null}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
