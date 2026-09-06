import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getMarketingChannels,
  type MarketingCapabilityState,
  type MarketingChannel,
  type MarketingChannelSetupStatus,
  type MarketingConfigurationCompleteness,
  type MarketingProviderConnectivity,
} from "@/src/lib/admin-api/marketing-channels";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import { setChannelStatusAction } from "./actions";
import styles from "./channels.module.css";

type ChannelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormat = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

const setupLabels: Record<MarketingChannelSetupStatus, string> = {
  SetupRequired: "نیازمند تنظیم امن",
  CredentialAvailable: "Credential موجود",
  Disabled: "غیرفعال",
};

const connectivityLabels: Record<MarketingProviderConnectivity, string> = {
  NotVerified: "بررسی نشده",
  Unsupported: "پشتیبانی نمی‌شود",
  VerificationPending: "در حال بررسی",
  Verified: "تأییدشده",
  VerificationStale: "تأیید منقضی/قدیمی",
  ReconnectRequired: "نیازمند اتصال مجدد",
  CredentialExpired: "Credential منقضی",
  RateLimited: "محدودیت Provider",
  Degraded: "اختلال نسبی",
  Disabled: "غیرفعال",
  Unavailable: "در دسترس نیست",
};

const capabilityLabels: Record<MarketingCapabilityState, string> = {
  Supported: "قابل استفاده و تأییدشده",
  Unsupported: "پشتیبانی نمی‌شود",
  NotVerified: "قابل تأیید نیست",
};

const completenessLabels: Record<MarketingConfigurationCompleteness, string> = {
  complete: "کامل",
  partial: "ناقص",
  missing: "تنظیم نشده",
  unknown: "گزارش نشده",
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function instantLabel(value: string | undefined): string {
  return value ? dateFormat.format(new Date(value)) : "از API گزارش نشده";
}

function capabilityLabel(value: MarketingCapabilityState | undefined): string {
  return value ? capabilityLabels[value] : "از API گزارش نشده";
}

function actionRequired(channel: MarketingChannel): string {
  if (channel.operatorStatus === "Disabled") {
    return "کانال operational غیرفعال است؛ قبل از هر انتشار باید وضعیت و provider دوباره بررسی شود.";
  }
  if (!channel.credentialAvailable) {
    return "Credential امن در server/Vault تنظیم نشده است؛ عملیات provider باید fail-closed بماند.";
  }
  switch (channel.providerConnectivity) {
    case "Verified":
      return channel.capabilities?.publishing || channel.capabilities?.analytics
        ? "اتصال تأیید شده است؛ فقط capability لازم برای هر عملیات را جداگانه ملاک قرار دهید."
        : "اتصال تأیید شده، اما ماتریس capability هنوز از API گزارش نشده است.";
    case "ReconnectRequired":
    case "CredentialExpired":
      return "Credential باید از مسیر امن provider دوباره authorize/refresh شود.";
    case "VerificationStale":
      return "Health check تازه لازم است؛ تأیید قدیمی نباید مجوز انتشار یا ingestion بدهد.";
    case "RateLimited":
      return "Provider rate limit فعال است؛ عملیات تا بازگشت ظرفیت باید متوقف یا محدود شود.";
    case "Degraded":
    case "Unavailable":
      return "Provider سالم تأیید نشده است؛ خطای نرمال‌شده را بررسی و عملیات خارجی را متوقف کنید.";
    case "Unsupported":
      return "این provider برای API automation پشتیبانی نمی‌شود؛ فقط مسیر manual fallback مجاز است.";
    case "VerificationPending":
      return "تأیید provider هنوز کامل نشده است؛ تا نتیجه نهایی عملیات خارجی مجاز نیست.";
    case "Disabled":
      return "Provider در backend غیرفعال گزارش شده است؛ عملیات خارجی مجاز نیست.";
    case "NotVerified":
      return "Server-side health/capability verification هنوز evidence قابل اتکا نداده است.";
  }
}

function ChannelCard({ channel, canControl }: { channel: MarketingChannel; canControl: boolean }) {
  const nextEnabled = channel.operatorStatus === "Disabled";
  return (
    <article className={styles.channelCard} data-state={channel.setupStatus}>
      <div className={styles.channelHead}>
        <div className={styles.providerMark} aria-hidden="true">
          {channel.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h3>{channel.displayName}</h3>
          <code>{channel.providerCode}</code>
          {channel.providerIdentity ? (
            <p className={styles.readOnlyNote}>{channel.providerIdentity}</p>
          ) : null}
        </div>
        <span className={styles.stateBadge}>{setupLabels[channel.setupStatus]}</span>
      </div>

      <dl className={styles.meta}>
        <div>
          <dt>وضعیت عملیاتی</dt>
          <dd>{channel.operatorStatus === "Enabled" ? "فعال" : "غیرفعال"}</dd>
        </div>
        <div>
          <dt>Credential</dt>
          <dd>{channel.credentialAvailable ? "موجود در Vault" : "ثبت نشده"}</dd>
        </div>
        <div>
          <dt>Provider connectivity</dt>
          <dd>{connectivityLabels[channel.providerConnectivity]}</dd>
        </div>
        <div>
          <dt>کامل بودن تنظیمات</dt>
          <dd>
            {channel.configurationCompleteness
              ? completenessLabels[channel.configurationCompleteness]
              : "از API گزارش نشده"}
          </dd>
        </div>
        <div>
          <dt>آخرین health check</dt>
          <dd>{instantLabel(channel.lastHealthCheckAtUtc)}</dd>
        </div>
        <div>
          <dt>آخرین تأیید موفق</dt>
          <dd>{instantLabel(channel.lastVerifiedAtUtc)}</dd>
        </div>
        <div>
          <dt>آخرین خطای نرمال‌شده</dt>
          <dd>{channel.healthFailureCode ?? "از API گزارش نشده"}</dd>
        </div>
        <div>
          <dt>آخرین تغییر</dt>
          <dd>{dateFormat.format(new Date(channel.updatedAtUtc))}</dd>
        </div>
        <div>
          <dt>آمادگی انتشار</dt>
          <dd>{capabilityLabel(channel.capabilities?.publishing)}</dd>
        </div>
        <div>
          <dt>آمادگی Analytics</dt>
          <dd>{capabilityLabel(channel.capabilities?.analytics)}</dd>
        </div>
      </dl>

      <div className={styles.truthBox}>
        <strong>اقدام لازم: </strong>
        {actionRequired(channel)}
      </div>

      <div className={styles.truthBox}>
        {channel.providerConnectivity === "Verified"
          ? "Connected فقط به دلیل provider evidence معتبر نمایش داده شده است؛ readiness هر عملیات همچنان از capability همان عملیات می‌آید."
          : channel.setupStatus === "CredentialAvailable"
            ? "Credential روی سرور موجود است؛ این به معنی اتصال یا سلامت API provider نیست."
            : channel.setupStatus === "SetupRequired"
              ? "هیچ Credential قابل استفاده‌ای در Vault شناسایی نشده است؛ انتشار باید fail-closed بماند."
              : "کانال توسط اپراتور غیرفعال است؛ حتی وجود Credential نیز اجازه انتشار نمی‌دهد."}
      </div>

      {canControl ? (
        <form action={setChannelStatusAction} className={styles.controlForm}>
          <input type="hidden" name="providerCode" value={channel.providerCode} />
          <input type="hidden" name="enabled" value={String(nextEnabled)} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={`channel-status-${channel.providerCode}-${crypto.randomUUID()}`}
          />
          <label>
            <span>دلیل تغییر</span>
            <input
              name="reason"
              minLength={10}
              maxLength={1000}
              placeholder={
                nextEnabled ? "دلیل فعال‌سازی مجدد کانال" : "دلیل توقف انتشار از این کانال"
              }
              required
            />
          </label>
          <button type="submit" data-action={nextEnabled ? "enable" : "disable"}>
            {nextEnabled ? "فعال‌سازی operational" : "غیرفعال‌سازی فوری"}
          </button>
        </form>
      ) : (
        <p className={styles.readOnlyNote}>
          کنترل وضعیت به permission پرریسک `marketing.social.publish` نیاز دارد.
        </p>
      )}
    </article>
  );
}

export default async function MarketingChannelsPage({ searchParams }: ChannelPageProps) {
  const admin = await requireAdminAccess();
  const canRead = admin.permissions.includes("marketing.read");
  const canControl = admin.permissions.includes("marketing.social.publish");
  const result = canRead ? await getMarketingChannels() : null;
  if (result?.kind === "unauthenticated") redirect("/login");

  const raw = await searchParams;
  const notice = one(raw.notice);
  const message = one(raw.message);

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="marketing"
        title="اتصال کانال‌ها"
        subtitle="وضعیت امن integration بدون نمایش token، secret یا payload شبکه اجتماعی"
      >
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Secure channel boundary</p>
              <h2>قبل از Publish، اول باید بدانیم واقعاً چه چیزی آماده است.</h2>
              <p>
                این صفحه وضعیت operational، وجود Credential و فقط health/capability evidence
                نرمال‌شده‌ای را نشان می‌دهد که سرور واقعاً گزارش کرده باشد. مقدار Credential، OAuth
                token و raw provider payload هرگز به مرورگر فرستاده نمی‌شود و «Credential موجود»
                مساوی «Connected» نیست.
              </p>
            </div>
            <div className={styles.heroActions}>
              <Link href="/marketing/campaigns">کمپین‌ها</Link>
              <Link href="/marketing">Marketing Overview</Link>
            </div>
          </section>

          {notice && message ? (
            <div
              className={styles.notice}
              data-kind={notice}
              role={notice === "error" ? "alert" : "status"}
            >
              {message}
            </div>
          ) : null}

          {!canRead ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "forbidden" ? (
            <AdminPageState state="forbidden" />
          ) : result?.kind === "unavailable" ? (
            <AdminPageState
              state="unavailable"
              description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
            />
          ) : result?.kind === "ok" && result.data.items.length === 0 ? (
            <AdminPageState
              state="empty"
              title="کانالی در catalog ثبت نشده"
              description="هیچ اتصال نمایشی ساخته نمی‌شود؛ ابتدا integration catalog باید در سرور تعریف شود."
            />
          ) : result?.kind === "ok" ? (
            <>
              <div className={styles.legend} aria-label="تعریف وضعیت کانال‌ها">
                <span>SetupRequired = Credential وجود ندارد</span>
                <span>CredentialAvailable = secret فقط روی سرور موجود است</span>
                <span>Verified = فقط با provider evidence معتبر</span>
                <span>Capability گزارش‌نشده = قابل استفاده فرض نمی‌شود</span>
              </div>
              <section className={styles.grid} aria-label="وضعیت کانال‌های Marketing">
                {result.data.items.map((channel) => (
                  <ChannelCard
                    channel={channel}
                    canControl={canControl}
                    key={channel.providerCode}
                  />
                ))}
              </section>
              <p className={styles.freshness}>
                منبع: {result.data.freshness.source} · آخرین خواندن:{" "}
                {dateFormat.format(new Date(result.data.freshness.asOfUtc))}
              </p>
            </>
          ) : (
            <AdminPageState state="unavailable" />
          )}
        </div>
      </AdminShell>
    </AdminSessionProvider>
  );
}
