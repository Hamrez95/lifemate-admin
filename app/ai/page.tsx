import Image from "next/image";
import Link from "next/link";
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

const topicLabels: Record<AdvisorTopic, { title: string; description: string; icon: string }> = {
  product_overview: {
    title: "نمای کلی محصول",
    description: "جمع‌بندی KPIهای تأییدشده برای تصمیم مدیریتی.",
    icon: "◇",
  },
  acquisition: {
    title: "جذب کاربران",
    description: "تمرکز روی ورودی حساب‌های جدید در read model مجاز.",
    icon: "↗",
  },
  activity: {
    title: "فعالیت کاربران",
    description: "بررسی فعالیت ماهانه با freshness واقعی داده.",
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
  return Number.isNaN(date.getTime()) ? "نامشخص" : dateTimeFormat.format(date);
}

function displayValue(value: number | null): string {
  return value === null ? "ناموجود" : numberFormat.format(value);
}

function EvidenceCard({ item }: { item: AdvisorEvidence }) {
  return (
    <article className={styles.evidenceCard} data-state={item.state}>
      <div className={styles.evidenceHead}>
        <div>
          <span className={styles.eyebrow}>داده پشتیبان</span>
          <h4>{evidenceLabels[item.label] ?? item.label}</h4>
        </div>
        <strong>{displayValue(item.value)}</strong>
      </div>
      <div className={styles.evidenceMeta}>
        <span>وضعیت: {item.state}</span>
        <span>تازگی: {item.freshness.status}</span>
        <span>به‌روزرسانی: {displayDate(item.freshness.asOfUtc)}</span>
      </div>
      <p className={styles.sourceLine}>منبع canonical: {item.source}</p>
      {item.caveat ? <p className={styles.caveat}>{item.caveat}</p> : null}
    </article>
  );
}

function InsightResult({ insight }: { insight: AdvisorInsight }) {
  return (
    <section className={styles.answerPanel} aria-labelledby="advisor-answer-title">
      <header className={styles.answerHeader}>
        <div>
          <span className={styles.eyebrow}>پاسخ تأییدشده Core</span>
          <h3 id="advisor-answer-title">جمع‌بندی مشاور</h3>
        </div>
        <span className={styles.safeBadge}>فقط داده کسب‌وکاری مجاز</span>
      </header>

      <p className={styles.summary}>{insight.summary}</p>

      <div className={styles.findingList}>
        {insight.findings.map((finding, index) => (
          <article key={`${finding.title}-${index}`} data-severity={finding.severity}>
            <span>{finding.severity === "attention" ? "نیازمند توجه" : "اطلاع"}</span>
            <h4>{finding.title}</h4>
            <p>{finding.detail}</p>
          </article>
        ))}
      </div>

      <section className={styles.evidenceSection} aria-labelledby="evidence-title">
        <div className={styles.sectionTitleRow}>
          <div>
            <span className={styles.eyebrow}>Evidence</span>
            <h3 id="evidence-title">داده‌های پشتیبان پاسخ</h3>
          </div>
          <span>{numberFormat.format(insight.evidence.length)} منبع</span>
        </div>
        <div className={styles.evidenceGrid}>
          {insight.evidence.map((item) => (
            <EvidenceCard key={item.sourceId} item={item} />
          ))}
        </div>
      </section>

      <aside className={styles.boundaryBox} aria-label="مرز ایمنی مشاور هوشمند">
        <div>
          <strong>مرز داده فعال است.</strong>
          <p>
            این صفحه فقط read modelهای کسب‌وکاری allowlisted را مصرف می‌کند. داده سلامت خام، داده
            هویتی حساس و توصیه پزشکی در این سطح مجاز نیستند.
          </p>
        </div>
        <span>{insight.model.status === "not_configured" ? "مدل خارجی غیرفعال" : "محافظت‌شده"}</span>
      </aside>

      {insight.caveats.length > 0 ? (
        <details className={styles.caveats}>
          <summary>محدودیت‌های پاسخ</summary>
          <ul>
            {insight.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className={styles.generatedAt}>زمان تولید پاسخ: {displayDate(insight.generatedAtUtc)}</p>
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
        title="مشاور هوشمند LifeMate"
        subtitle="تحلیل مدیریتی read-only روی قراردادهای تأییدشده Core"
      >
        <main className={styles.page}>
          <nav className={styles.aiTabs} aria-label="بخش‌های هوش مصنوعی">
            <Link href="/ai/daily-brief">گزارش روزانه</Link>
            <Link href="/ai" aria-current="page">
              مشاور هوشمند
            </Link>
          </nav>

          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>LifeMate AI Advisor · Canonical only</p>
              <h2>از داده تأییدشده سؤال مدیریتی بپرس؛ پاسخ بدون مدرک نمایش داده نمی‌شود.</h2>
              <p>
                مطابق مرجع صفحه ۲۵، مسیر تحلیل کوتاه و تصمیم‌محور است. سؤال شما فقط context است و
                منبع داده یا permission را تغییر نمی‌دهد.
              </p>
              <div className={styles.heroBadges}>
                <span>Read only</span>
                <span>Analytics allowlist</span>
                <span>بدون داده سلامت خام</span>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <Image
                src="/design-assets/ai-advisor-hero-v1.png"
                alt="تصویر انتزاعی مشاور هوشمند LifeMate"
                width={720}
                height={560}
                sizes="(max-width: 760px) 78vw, 330px"
              />
            </div>
          </header>

          {!canUseAdvisor ? (
            <AdminPageState
              state="forbidden"
              title="دسترسی مشاور فعال نیست"
              description="برای این صفحه مجوز ai.advisor.read لازم است."
            />
          ) : !canReadAnalytics ? (
            <AdminPageState
              state="forbidden"
              title="منبع تحلیل مجاز نیست"
              description="برای خواندن evidence این صفحه مجوز analytics.read نیز لازم است."
            />
          ) : (
            <>
              <section className={styles.askPanel} aria-labelledby="ask-title">
                <div className={styles.askHead}>
                  <div>
                    <span className={styles.eyebrow}>تحلیل جدید</span>
                    <h3 id="ask-title">موضوع بررسی را انتخاب کنید</h3>
                  </div>
                  <span className={styles.safeBadge}>بدون mutation</span>
                </div>

                <form method="get" className={styles.askForm}>
                  <input type="hidden" name="run" value="1" />
                  <fieldset className={styles.topicGrid}>
                    <legend>دامنه داده مجاز</legend>
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
                    <span>سؤال مدیریتی اختیاری</span>
                    <textarea
                      name="q"
                      rows={3}
                      maxLength={500}
                      defaultValue={question}
                      placeholder="مثلاً: در جذب یا فعالیت کاربران چه چیزی نیازمند توجه است؟"
                    />
                    <small>
                      اطلاعات هویتی، سلامت، پزشکی یا متن حساس وارد نکنید. سؤال به SQL یا connector
                      آزاد تبدیل نمی‌شود.
                    </small>
                  </label>

                  <button type="submit" className={styles.runButton}>
                    تحلیل با داده canonical
                  </button>
                </form>
              </section>

              {result?.kind === "ok" ? (
                <InsightResult insight={result.data} />
              ) : result?.kind === "forbidden" ? (
                <AdminPageState
                  state="forbidden"
                  title="منبع درخواستی مجاز نیست"
                  description={result.message ?? "Core این درخواست را مجاز ندانست."}
                />
              ) : result?.kind === "invalid" ? (
                <AdminPageState
                  state="error"
                  title="درخواست معتبر نیست"
                  description="موضوع یا متن سؤال را کوتاه‌تر و بدون داده حساس ارسال کنید."
                />
              ) : result?.kind === "unavailable" ? (
                <AdminPageState
                  state="unavailable"
                  title="پاسخ فعلاً در دسترس نیست"
                  description={
                    result.correlationId
                      ? `کد پیگیری: ${result.correlationId}`
                      : "هیچ پاسخ جایگزین یا ساختگی نمایش داده نمی‌شود."
                  }
                />
              ) : submitted ? (
                <AdminPageState
                  state="unavailable"
                  title="پاسخی دریافت نشد"
                  description="هیچ خلاصه ساختگی نمایش داده نمی‌شود."
                />
              ) : (
                <section className={styles.startState} aria-label="راهنمای شروع مشاور">
                  <div>
                    <strong>۱. دامنه را انتخاب کنید</strong>
                    <p>فقط KPIهای allowlisted در قرارداد Advisor خوانده می‌شوند.</p>
                  </div>
                  <div>
                    <strong>۲. پاسخ را با evidence بخوانید</strong>
                    <p>مقدار ناموجود به صفر تبدیل نمی‌شود و freshness کنار داده باقی می‌ماند.</p>
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
