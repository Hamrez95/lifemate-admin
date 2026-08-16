import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getMarketingAiContentGenerations,
  marketingAiContentGoals,
  marketingAiContentLanguages,
  marketingAiContentTones,
  type MarketingAiContentGeneration,
} from "@/src/lib/admin-api/marketing-ai-content";
import { getMarketingCampaignDetail } from "@/src/lib/admin-api/marketing-campaign-detail";
import { getMarketingCampaigns } from "@/src/lib/admin-api/marketing-campaigns";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { generateMarketingContentAction } from "./actions";
import styles from "./studio.module.css";

type ContentStudioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateTimeFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

const goalLabels = {
  awareness: "آگاهی از برند",
  launch: "لانچ / معرفی",
  education: "آموزش",
  engagement: "تعامل",
  retention: "بازگشت و همراهی",
} as const;
const toneLabels = {
  warm: "گرم و انسانی",
  clear: "شفاف و مستقیم",
  energetic: "پرانرژی",
  professional: "حرفه‌ای",
} as const;
const languageLabels = { fa: "فارسی", en: "English" } as const;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

function safeNotice(value: string): "success" | "error" | null {
  return value === "success" || value === "error" ? value : null;
}

function Variants({
  generation,
  campaignId,
  canWrite,
}: {
  generation: MarketingAiContentGeneration;
  campaignId: string;
  canWrite: boolean;
}) {
  return (
    <section className={styles.variantsSection} aria-labelledby="studio-variants-title">
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.eyebrow}>Review-only output</span>
          <h3 id="studio-variants-title">سه Draft برای مقایسه انسانی</h3>
          <p>
            این خروجی‌ها AI-generated Draft هستند. انتخاب متن، ثبت revision، تأیید و انتشار همچنان
            workflowهای انسانی و جداگانه‌اند.
          </p>
        </div>
        <span className={styles.draftBadge}>AI Draft · Not approved</span>
      </div>

      <div className={styles.variantsGrid}>
        {generation.variants.map((variant, index) => (
          <article className={styles.variantCard} key={variant.id}>
            <span className={styles.draftBadge}>Variant {index + 1}</span>
            <h4>{variant.headline}</h4>
            <textarea
              className={styles.variantBody}
              readOnly
              value={variant.body}
              aria-label={`متن Variant ${index + 1}`}
            />
            <div className={styles.tags} aria-label="هشتگ‌های پیشنهادی">
              {variant.hashtags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <p className={styles.rationale}>{variant.rationale}</p>
            <div className={styles.variantFooter}>
              <Link href={`/marketing/campaigns/${campaignId}`} className={styles.reviewLink}>
                رفتن به بازبینی انسانی کمپین
              </Link>
              <p className={styles.reviewHint}>
                {canWrite
                  ? "متن را پس از بازبینی انسانی در Campaign Content ثبت کن؛ این دکمه چیزی را auto-approve نمی‌کند."
                  : "برای ثبت revision یا تأیید محتوا، marketing.campaign.write لازم است."}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function ContentStudioPage({ searchParams }: ContentStudioPageProps) {
  const admin = await requireAdminAccess();
  const canReadMarketing = admin.permissions.includes("marketing.read");
  const canUseStudio = admin.permissions.includes("ai.marketing.use");
  const canWriteCampaign = admin.permissions.includes("marketing.campaign.write");
  const raw = await searchParams;
  const notice = safeNotice(one(raw.notice));
  const noticeMessage = one(raw.message).slice(0, 500);

  const campaignParams = new URLSearchParams({ page: "1", pageSize: "50" });
  const campaignResult =
    canReadMarketing && canUseStudio ? await getMarketingCampaigns(campaignParams) : null;
  if (campaignResult?.kind === "unauthenticated") redirect("/login");

  const requestedCampaign = one(raw.campaign).trim();
  const items = campaignResult?.kind === "ok" ? campaignResult.data.items : [];
  const selectedCampaignId = UUID_PATTERN.test(requestedCampaign)
    ? requestedCampaign
    : (items[0]?.id ?? "");

  const [detailResult, generationsResult] = selectedCampaignId
    ? await Promise.all([
        getMarketingCampaignDetail(selectedCampaignId),
        getMarketingAiContentGenerations(selectedCampaignId),
      ])
    : [null, null];
  if (detailResult?.kind === "unauthenticated" || generationsResult?.kind === "unauthenticated") {
    redirect("/login");
  }

  const detail = detailResult?.kind === "ok" ? detailResult.data : null;
  const generationList = generationsResult?.kind === "ok" ? generationsResult.data : null;
  const latest = generationList?.items[0] ?? null;
  const idempotencyKey = `contentstudio:${crypto.randomUUID()}`;

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="AI Content Studio"
        subtitle="ایده و variant برای کمپین؛ همیشه Draft و همیشه با بازبینی انسان"
      >
        <main className={styles.page}>
          <header className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>LifeMate Marketing Intelligence</span>
              <h2>ایده‌پردازی سریع، بدون دادن کلید انتشار به AI.</h2>
              <p>
                Content Studio فقط از context محدود کمپین استفاده می‌کند: نام، هدف، محصول، کانال و
                brief. Health/Women Health خام، provider secret، SQL آزاد و publish خودکار در این
                boundary وجود ندارند.
              </p>
            </div>
            <aside className={styles.guardrailPanel} aria-label="مرزهای Content Studio">
              <strong>Human-in-the-loop by design</strong>
              <ul className={styles.guardrailList}>
                <li>AI فقط Draft می‌سازد</li>
                <li>تأیید محتوا workflow جداست</li>
                <li>انتشار خودکار صفر</li>
                <li>Provider credential در browser صفر</li>
              </ul>
            </aside>
          </header>

          {notice && noticeMessage ? (
            <div
              className={styles.notice}
              data-kind={notice}
              role={notice === "error" ? "alert" : "status"}
            >
              {noticeMessage}
            </div>
          ) : null}

          {!canReadMarketing || !canUseStudio ? (
            <AdminPageState
              state="forbidden"
              title="دسترسی Content Studio فعال نیست"
              description="برای این صفحه marketing.read و ai.marketing.use هر دو لازم‌اند."
            />
          ) : campaignResult?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : campaignResult?.kind === "unavailable" ? (
            <AdminPageState
              state="unavailable"
              description={
                campaignResult.correlationId
                  ? `کد پیگیری: ${campaignResult.correlationId}`
                  : undefined
              }
            />
          ) : campaignResult?.kind !== "ok" ? (
            <AdminPageState state="error" title="فهرست کمپین‌ها قابل خواندن نیست" />
          ) : campaignResult.data.items.length === 0 ? (
            <AdminPageState
              state="empty"
              title="هنوز کمپینی برای Content Studio نداریم"
              description="ابتدا یک Campaign بساز؛ Studio بدون context واقعی کمپین متن نمایشی تولید نمی‌کند."
            />
          ) : (
            <>
              <section className={styles.selectorCard} aria-labelledby="studio-campaign-title">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.eyebrow}>Campaign context</span>
                    <h3 id="studio-campaign-title">کمپین مبنا را انتخاب کن</h3>
                    <p>
                      Studio فقط context همان کمپین را می‌بیند و از داده خام کاربران تغذیه نمی‌شود.
                    </p>
                  </div>
                  <span className={styles.statusBadge}>
                    {campaignResult.data.total.toLocaleString("fa-IR")} کمپین
                  </span>
                </div>
                <form method="get" className={styles.selectorForm}>
                  <select
                    name="campaign"
                    defaultValue={selectedCampaignId}
                    aria-label="انتخاب کمپین"
                  >
                    {campaignResult.data.items.map((campaign) => (
                      <option value={campaign.id} key={campaign.id}>
                        {campaign.name} · {campaign.status}
                      </option>
                    ))}
                  </select>
                  <button type="submit">باز کردن Studio</button>
                </form>
              </section>

              {!detail ? (
                <AdminPageState
                  state={detailResult?.kind === "not_found" ? "empty" : "unavailable"}
                  title="Context کمپین قابل خواندن نیست"
                  description={
                    detailResult && "message" in detailResult
                      ? detailResult.message
                      : "Studio بدون context معتبر کمپین تولید را آغاز نمی‌کند."
                  }
                />
              ) : generationsResult?.kind === "forbidden" ? (
                <AdminPageState state="forbidden" />
              ) : generationsResult?.kind === "unavailable" ? (
                <AdminPageState
                  state="unavailable"
                  title="تاریخچه Content Studio قابل خواندن نیست"
                  description={
                    generationsResult.correlationId
                      ? `کد پیگیری: ${generationsResult.correlationId}`
                      : "هیچ Draft ساختگی نمایش داده نمی‌شود."
                  }
                />
              ) : (
                <>
                  <div className={styles.workspaceGrid}>
                    <div className={styles.contextStack}>
                      <section className={styles.contextCard} aria-labelledby="context-title">
                        <span className={styles.eyebrow}>Approved source context</span>
                        <h3 id="context-title">{detail.campaign.name}</h3>
                        <p>
                          {detail.campaign.objective ?? "Objective برای این کمپین ثبت نشده است."}
                        </p>
                        <div className={styles.contextGrid}>
                          <div>
                            <span>محصول</span>
                            <strong>{detail.campaign.productCode ?? "—"}</strong>
                          </div>
                          <div>
                            <span>کانال</span>
                            <strong>{detail.campaign.channelCode ?? "—"}</strong>
                          </div>
                          <div>
                            <span>Campaign state</span>
                            <strong>{detail.campaign.status}</strong>
                          </div>
                          <div>
                            <span>Content approval</span>
                            <strong>{detail.content.approvalState}</strong>
                          </div>
                          <div>
                            <span>Content revision</span>
                            <strong>
                              {detail.content.contentRevision.toLocaleString("fa-IR")}
                            </strong>
                          </div>
                          <div>
                            <span>Brief</span>
                            <strong>{detail.content.brief ?? "—"}</strong>
                          </div>
                        </div>
                      </section>

                      <section className={styles.boundaryCard} aria-labelledby="boundary-title">
                        <span className={styles.eyebrow}>Security boundary</span>
                        <h3 id="boundary-title">وضعیت واقعی مدل و دسترسی</h3>
                        <p>
                          فاز فعلی عمداً deterministic fallback است. «AI متصل» یا «Provider
                          Connected» جعل نمی‌شود.
                        </p>
                        <div className={styles.boundaryGrid}>
                          <div data-safe="true">
                            <span>Model</span>
                            <strong>{generationList?.model.status ?? "not_configured"}</strong>
                          </div>
                          <div data-safe="true">
                            <span>Generation mode</span>
                            <strong>{latest?.generationMode ?? "deterministic_fallback"}</strong>
                          </div>
                          <div data-safe="true">
                            <span>Auto publish</span>
                            <strong>Blocked</strong>
                          </div>
                          <div data-safe="true">
                            <span>Raw Health context</span>
                            <strong>Blocked</strong>
                          </div>
                        </div>
                      </section>
                    </div>

                    <section className={styles.generatorCard} aria-labelledby="generator-title">
                      <div className={styles.sectionHead}>
                        <div>
                          <span className={styles.eyebrow}>Bounded generation</span>
                          <h3 id="generator-title">یک بسته Draft جدید بساز</h3>
                          <p>
                            Prompt آزاد وجود ندارد؛ فقط goal، tone، language، پیام کلیدی و CTA
                            کنترل‌شده.
                          </p>
                        </div>
                        <span className={styles.modelBadge}>Model: not_configured</span>
                      </div>

                      <form
                        action={generateMarketingContentAction}
                        className={styles.generatorForm}
                      >
                        <input type="hidden" name="campaignId" value={detail.campaign.id} />
                        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
                        <div className={styles.controlGrid}>
                          <label>
                            <span>هدف محتوا</span>
                            <select name="goal" defaultValue="awareness">
                              {marketingAiContentGoals.map((value) => (
                                <option key={value} value={value}>
                                  {goalLabels[value]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>لحن</span>
                            <select name="tone" defaultValue="warm">
                              {marketingAiContentTones.map((value) => (
                                <option key={value} value={value}>
                                  {toneLabels[value]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>زبان</span>
                            <select name="language" defaultValue="fa">
                              {marketingAiContentLanguages.map((value) => (
                                <option key={value} value={value}>
                                  {languageLabels[value]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label>
                          <span>پیام کلیدی اختیاری</span>
                          <textarea
                            name="keyMessage"
                            maxLength={500}
                            placeholder="مثلاً: مدیریت سلامت روزمره باید ساده، انسانی و قابل اعتماد باشد."
                          />
                          <small>
                            حداکثر ۵۰۰ نویسه؛ متن به‌عنوان data دیده می‌شود، نه دستور اجرای ابزار.
                          </small>
                        </label>
                        <label>
                          <span>CTA اختیاری</span>
                          <input
                            name="callToAction"
                            maxLength={240}
                            placeholder="مثلاً: LifeMate را بیشتر بشناس"
                          />
                          <small>
                            اگر خالی باشد، fallback کنترل‌شده بر اساس goal انتخاب می‌شود.
                          </small>
                        </label>
                        <div className={styles.formFooter}>
                          <p>
                            Generate فقط draft ledger می‌سازد. هیچ approval، publish job یا provider
                            call در این action وجود ندارد.
                          </p>
                          <button type="submit" className={styles.primaryButton}>
                            ساخت ۳ Draft
                          </button>
                        </div>
                      </form>
                    </section>
                  </div>

                  {latest ? (
                    <Variants
                      generation={latest}
                      campaignId={detail.campaign.id}
                      canWrite={canWriteCampaign}
                    />
                  ) : (
                    <div className={styles.emptyBox}>
                      هنوز Draftی برای این کمپین ساخته نشده است. فرم بالا اولین generation را به
                      ledger امن اضافه می‌کند؛ داده نمونه یا variant جعلی نمایش داده نمی‌شود.
                    </div>
                  )}

                  {generationList && generationList.items.length > 0 ? (
                    <section
                      className={styles.historySection}
                      aria-labelledby="studio-history-title"
                    >
                      <div className={styles.sectionHead}>
                        <div>
                          <span className={styles.eyebrow}>Draft history</span>
                          <h3 id="studio-history-title">تاریخچه generationهای این کمپین</h3>
                          <p>
                            این تاریخچه evidence تولید است؛ approval و publish history در صفحه کمپین
                            جداست.
                          </p>
                        </div>
                        <span className={styles.statusBadge}>
                          {generationList.items.length.toLocaleString("fa-IR")} مورد
                        </span>
                      </div>
                      <div className={styles.historyList}>
                        {generationList.items.map((generation) => (
                          <article className={styles.historyItem} key={generation.id}>
                            <div>
                              <strong>
                                {goalLabels[generation.goal]} · {toneLabels[generation.tone]}
                              </strong>
                              <p>{generation.keyMessage ?? "بدون پیام کلیدی دستی"}</p>
                              <div className={styles.historyMeta}>
                                <span>{formatDate(generation.createdAtUtc)}</span>
                                <span>{languageLabels[generation.language]}</span>
                                <span>
                                  {generation.variants.length.toLocaleString("fa-IR")} variant
                                </span>
                              </div>
                            </div>
                            <span className={styles.draftBadge}>{generation.modelStatus}</span>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
            </>
          )}
        </main>
      </AdminShell>
    </AdminSessionProvider>
  );
}
