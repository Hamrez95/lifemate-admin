import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  advisorTopics,
  getAdvisorInsight,
  type AdvisorEvidence,
  type AdvisorInsight,
  type AdvisorTopic,
} from "@/src/lib/admin-api/ai-advisor";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import styles from "./advisor.module.css";

type AiPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateTimeFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});
const numberFormat = new Intl.NumberFormat("fa-IR");

const topicLabels: Record<
  AdvisorTopic,
  { title: string; description: string; icon: string }
> = {
  product_overview: {
    title: "نمای کلی محصول",
    description: "ترکیب شاخص‌های جذب و فعالیت برای یک نگاه مدیریتی کوتاه.",
    icon: "◈",
  },
  acquisition: {
    title: "جذب و ورود کاربران",
    description: "تمرکز روی حساب‌های جدید در read model تأییدشده.",
    icon: "↗",
  },
  activity: {
    title: "فعالیت کاربران",
    description: "تمرکز روی Monthly Active Accounts با freshness واقعی.",
    icon: "◎",
  },
};

const evidenceLabels: Record<string, string> = {
  accounts_created: "حساب‌های ایجادشده",
  monthly_active_accounts: "حساب‌های فعال ماهانه",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function validTopic(value: string): AdvisorTopic {
  return advisorTopics.includes(value as AdvisorTopic)
    ? (value as AdvisorTopic)
    : "product_overview";
}

function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

function displayValue(value: number | null): string {
  return value === null ? "ناموجود" : numberFormat.format(value);
}

function EvidenceCard({ item }: { item: AdvisorEvidence }) {
  return (
    <article className={styles.evidenceCard} data-state={item.state}>
      <div className={styles.evidenceHead}>
        <div>
          <span className={styles.eyebrow}>Evidence</span>
          <h4>{evidenceLabels[item.label] ?? item.label}</h4>
        </div>
        <strong>{displayValue(item.value)}</strong>
      </div>
      <dl>
        <div>
          <dt>وضعیت</dt>
          <dd>{item.state}</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>{item.freshness.status}</dd>
        </div>
        <div>
          <dt>As of</dt>
          <dd>{displayDate(item.freshness.asOfUtc)}</dd>
        </div>
        <div>
          <dt>Source ID</dt>
          <dd>{item.sourceId}</dd>
        </div>
      </dl>
      <p className={styles.sourceLine}>{item.source}</p>
      {item.caveat ? <p className={styles.caveat}>{item.caveat}</p> : null}
    </article>
  );
}

function InsightResult({ insight }: { insight: AdvisorInsight }) {
  return (
    <section className={styles.answerPanel} aria-labelledby="advisor-answer-title">
      <header className={styles.answerHeader}>
        <div>
          <span className={styles.eyebrow}>Grounded insight</span>
          <h3 id="advisor-answer-title">جمع‌بندی Advisor</h3>
        </div>
        <div className={styles.modeBadge}>
          <span>Mode</span>
          <strong>{insight.mode}</strong>
        </div>
      </header>

      <p className={styles.summary}>{insight.summary}</p>

      <div className={styles.findingList}>
        {insight.findings.map((finding, index) => (
          <article key={`${finding.title}-${index}`} data-severity={finding.severity}>
            <span>{finding.severity === "attention" ? "نیازمند توجه" : "اطلاع"}</span>
            <h4>{finding.title}</h4>
            <p>{finding.detail}</p>
            <small>Evidence: {finding.evidenceIds.join(" · ")}</small>
          </article>
        ))}
      </div>

      <div className={styles.evidenceGrid}>
        {insight.evidence.map((item) => (
          <EvidenceCard key={item.sourceId} item={item} />
        ))}
      </div>

      <aside className={styles.boundaryBox} aria-label="مرزهای امنیتی Advisor">
        <div>
          <strong>مدل خارجی در فاز اول فعال نیست.</strong>
          <p>
            نتیجه از fallback قطعی و evidence-backed ساخته شده است؛ بنابراین قطع مدل یا prompt
            injection نمی‌تواند منبع داده یا permission را تغییر دهد.
          </p>
        </div>
        <span>{insight.model.status}</span>
      </aside>

      <details className={styles.caveats}>
        <summary>محدودیت‌ها و caveatها</summary>
        <ul>
          {insight.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      </details>

      <p className={styles.generatedAt}>
        تولید پاسخ: {displayDate(insight.generatedAtUtc)}
      </p>
    </section>
  );
}

export default async function AiPage({ searchParams }: AiPageProps) {
  const admin = await requireAdminAccess();
  const canUseAdvisor = admin.permissions.includes("ai.advisor.read");
  const canReadAnalytics = admin.permissions.includes("analytics.read");
  const raw = await searchParams;
  const topic = validTopic(one(raw.topic));
  const question = one(raw.q).trim().slice(0, 500);
  const submitted = one(raw.run) === "1";
  const result =
    submitted && canUseAdvisor && canReadAnalytics
      ? await getAdvisorInsight(topic, question || null)
      : null;
  if (result?.kind === "unauthenticated") redirect("/login");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="ai"
        title="AI Insight Desk"
        subtitle="Advisor داخلی و read-only روی read modelهای تأییدشده"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>LifeMate Intelligence · Read only</p>
              <h2>پاسخ کوتاه مدیریتی، با مدرک کنار هر نتیجه.</h2>
              <p>
                این بخش chatbot عمومی نیست. سؤال شما فقط موضوع بررسی را توضیح می‌دهد؛ منبع داده،
                permission و KPIها از allowlist ثابت انتخاب می‌شوند و هیچ SQL آزاد، health data خام یا
                mutation در دسترس Advisor نیست.
              </p>
            </div>
            <div className={styles.securityStamp}>
              <span>Data boundary</span>
              <strong>Approved read models only</strong>
              <small>Raw Health / Women Health: blocked</small>
            </div>
          </header>

          {!canUseAdvisor ? (
            <AdminPageState
              state="forbidden"
              title="دسترسی Advisor فعال نیست"
              description="برای این بخش permission اختصاصی ai.advisor.read لازم است."
            />
          ) : !canReadAnalytics ? (
            <AdminPageState
              state="forbidden"
              title="دسترسی منبع داده کامل نیست"
              description="Advisor علاوه بر permission خودش، permission منبع analytics.read را نیز نیاز دارد."
            />
          ) : (
            <>
              <section className={styles.askPanel} aria-labelledby="ask-title">
                <div className={styles.askHead}>
                  <div>
                    <span className={styles.eyebrow}>Ask with boundaries</span>
                    <h3 id="ask-title">موضوع را انتخاب کن و سؤال مدیریتی کوتاه بپرس</h3>
                  </div>
                  <span className={styles.readOnlyBadge}>No mutation</span>
                </div>

                <form method="get" className={styles.askForm}>
                  <input type="hidden" name="run" value="1" />
                  <fieldset className={styles.topicGrid}>
                    <legend>موضوع بررسی</legend>
                    {advisorTopics.map((item) => (
                      <label key={item} data-selected={topic === item}>
                        <input
                          type="radio"
                          name="topic"
                          value={item}
                          defaultChecked={topic === item}
                        />
                        <span className={styles.topicIcon} aria-hidden="true">
                          {topicLabels[item].icon}
                        </span>
                        <strong>{topicLabels[item].title}</strong>
                        <small>{topicLabels[item].description}</small>
                      </label>
                    ))}
                  </fieldset>
                  <label className={styles.questionField}>
                    <span>سؤال اختیاری</span>
                    <textarea
                      name="q"
                      rows={3}
                      maxLength={500}
                      defaultValue={question}
                      placeholder="مثلاً: الان از نظر جذب و فعالیت کاربران چه چیزی نیازمند توجه است؟"
                    />
                    <small>
                      متن سؤال به SQL، connector یا مدل خارجی تبدیل نمی‌شود؛ فقط untrusted context است.
                    </small>
                  </label>
                  <button type="submit" className={styles.runButton}>
                    بررسی read modelهای مجاز
                  </button>
                </form>
              </section>

              {result?.kind === "ok" ? (
                <InsightResult insight={result.data} />
              ) : result?.kind === "forbidden" ? (
                <AdminPageState
                  state="forbidden"
                  title="منبع درخواستی مجاز نیست"
                  description={result.message}
                />
              ) : result?.kind === "invalid" ? (
                <AdminPageState
                  state="error"
                  title="درخواست Advisor معتبر نیست"
                  description={result.message}
                />
              ) : result?.kind === "unavailable" ? (
                <AdminPageState
                  state="unavailable"
                  title="Advisor فعلاً به read model پاسخ نگرفت"
                  description={
                    result.correlationId
                      ? `کد پیگیری: ${result.correlationId}`
                      : "هیچ پاسخ ساختگی نمایش داده نمی‌شود. بعداً دوباره تلاش کنید."
                  }
                />
              ) : submitted ? (
                <AdminPageState state="unavailable" />
              ) : (
                <section className={styles.emptyState} aria-label="راهنمای شروع Advisor">
                  <span>01</span>
                  <div>
                    <strong>یک موضوع را انتخاب کن.</strong>
                    <p>
                      Advisor فقط همان KPIهای allowlisted را می‌خواند و نتیجه را همراه source و
                      freshness نشان می‌دهد.
                    </p>
                  </div>
                  <span>02</span>
                  <div>
                    <strong>نتیجه را به‌عنوان insight مدیریتی بخوان، نه حقیقت بدون زمینه.</strong>
                    <p>Unavailable و partial عمداً برجسته می‌شوند تا داده ناقص با صفر اشتباه نشود.</p>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
