import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getCircleDetail,
  type CircleDetailResponse,
  type CircleKind,
  type CircleSharingMode,
} from "@/src/lib/admin-api/circles";
import { requireAdminAccess } from "@/src/lib/admin-api/server";
import { formatPersianDateTime } from "@/src/lib/time-zone";

import referenceStyles from "../../relationships-reference.module.css";
import styles from "../../relationships.module.css";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const kindLabels: Record<CircleKind, string> = {
  women_health_planning: "Women Health Planning",
  family: "Family",
  care: "Care",
  pregnancy_support: "Pregnancy Support",
};

const sharingLabels: Record<CircleSharingMode, string> = {
  none: "بدون اشتراک",
  planning_only: "Planning only",
  limited_context: "Limited context",
};

type CircleDetailPageProps = {
  params: Promise<{ circleId: string }>;
};

function CircleTabs() {
  return (
    <nav className={referenceStyles.tabs} aria-label="بخش‌های روابط و Circle">
      <Link href="/relationships?kind=relationship">روابط</Link>
      <Link href="/relationships?kind=access_grant">مجوزهای دسترسی</Link>
      <Link href="/relationships?kind=consent">رضایت‌ها</Link>
      <Link href="/relationships/circles" data-active="true">
        Circleها
      </Link>
      <Link href="/relationships/ledger">تاریخچه و فعالیت‌ها</Link>
    </nav>
  );
}

function CircleDetail({ data }: { data: CircleDetailResponse }) {
  const activeMembers = data.members.filter((member) => member.status === "active").length;
  const pendingInvitations = data.invitations.filter((invitation) => invitation.status === "pending").length;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{kindLabels[data.circle.kind]}</span>
          <h2>{data.circle.name}</h2>
          <p>
            نمای ساختاری Circle برای پشتیبانی و عملیات. Membership، nickname/presentation و sharing
            mode هیچ‌کدام به‌تنهایی Health Permission نیستند.
          </p>
          <div className={referenceStyles.heroChips}>
            <span>{data.circle.status === "active" ? "فعال" : "بسته"}</span>
            <span>{activeMembers.toLocaleString("fa-IR")} عضو فعال</span>
            <span>{pendingInvitations.toLocaleString("fa-IR")} دعوت در انتظار</span>
          </div>
        </div>
      </section>

      <section className={referenceStyles.policyGrid} aria-label="مرز حریم خصوصی Circle">
        <article data-tone="green">
          <span className={referenceStyles.policyIcon} aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Structure-only response</strong>
            <p>
              Core این پاسخ را با privacy.scope=structure_only برگردانده و protected health content
              در contract حضور ندارد.
            </p>
          </div>
        </article>
        <article data-tone="blue">
          <span className={referenceStyles.policyIcon} aria-hidden="true">
            ◌
          </span>
          <div>
            <strong>Contact hash نمایش داده نمی‌شود</strong>
            <p>برای دعوت مبتنی بر contact فقط نوع مقصد نمایش داده می‌شود؛ hash/شماره/ایمیل وجود ندارد.</p>
          </div>
        </article>
      </section>

      <CircleTabs />

      <section className={styles.filterCard} aria-labelledby="circle-identity-title">
        <div>
          <span className={styles.eyebrow}>Circle identity</span>
          <h3 id="circle-identity-title">هویت و lifecycle</h3>
          <p>Owner و شناسه‌های ساختاری برای support؛ بدون داده سلامت.</p>
        </div>
        <div className={styles.activityMeta}>
          <span>Owner: {data.circle.ownerDisplayName ?? "نام نمایشی ثبت نشده"}</span>
          <code title="Owner Person ID">{data.circle.ownerPersonId}</code>
          <code title="Circle ID">{data.circle.circleId}</code>
          <span>نسخه: {data.circle.version.toLocaleString("fa-IR")}</span>
          <span>ایجاد: {formatPersianDateTime(data.circle.createdAtUtc)}</span>
          <span>به‌روزرسانی: {formatPersianDateTime(data.circle.updatedAtUtc)}</span>
          {data.circle.closedAtUtc ? (
            <span>بسته‌شدن: {formatPersianDateTime(data.circle.closedAtUtc)}</span>
          ) : null}
        </div>
      </section>

      <div className={referenceStyles.workspaceGrid}>
        <main className={referenceStyles.workspaceMain}>
          <section className={styles.activityCard} aria-labelledby="circle-members-title">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>Membership</span>
                <h3 id="circle-members-title">اعضای Circle</h3>
                <p>{data.members.length.toLocaleString("fa-IR")} membership record</p>
              </div>
            </div>

            {data.members.length === 0 ? (
              <AdminPageState
                state="empty"
                title="عضوی برای این Circle ثبت نشده"
                description="هیچ member ساختگی برای تکمیل UI ایجاد نمی‌شود."
              />
            ) : (
              <div className={styles.activityList}>
                {data.members.map((member) => (
                  <article className={styles.activityItem} key={member.membershipId}>
                    <div className={styles.activityIcon} aria-hidden="true">
                      {member.role === "owner" ? "◎" : "○"}
                    </div>
                    <div className={styles.activityBody}>
                      <div className={styles.activityTopline}>
                        <div>
                          <span className={styles.kindLabel}>{member.role}</span>
                          <strong>{member.displayName ?? "نام نمایشی ثبت نشده"}</strong>
                        </div>
                        <span className={styles.statusBadge} data-status={member.status}>
                          {member.status}
                        </span>
                      </div>
                      <p>Sharing mode: {sharingLabels[member.sharingMode]}</p>
                      <div className={styles.activityMeta}>
                        <code title="Person ID">{member.personId}</code>
                        <span>عضویت: {formatPersianDateTime(member.joinedAtUtc)}</span>
                        {member.leftAtUtc ? <span>خروج: {formatPersianDateTime(member.leftAtUtc)}</span> : null}
                        {member.removedAtUtc ? (
                          <span>حذف: {formatPersianDateTime(member.removedAtUtc)}</span>
                        ) : null}
                        {member.sharingRevokedAtUtc ? (
                          <span>لغو sharing: {formatPersianDateTime(member.sharingRevokedAtUtc)}</span>
                        ) : null}
                        {member.sharingVersion !== null ? (
                          <span>Sharing v{member.sharingVersion.toLocaleString("fa-IR")}</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.activityCard} aria-labelledby="circle-invitations-title">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>Invitations</span>
                <h3 id="circle-invitations-title">دعوت‌ها و lifecycle</h3>
                <p>{data.invitations.length.toLocaleString("fa-IR")} invitation record</p>
              </div>
            </div>

            {data.invitations.length === 0 ? (
              <AdminPageState state="empty" title="دعوتی برای این Circle ثبت نشده" />
            ) : (
              <div className={styles.activityList}>
                {data.invitations.map((invitation) => (
                  <article className={styles.activityItem} key={invitation.invitationId}>
                    <div className={styles.activityIcon} aria-hidden="true">
                      ↗
                    </div>
                    <div className={styles.activityBody}>
                      <div className={styles.activityTopline}>
                        <div>
                          <span className={styles.kindLabel}>{invitation.targetKind}</span>
                          <strong>
                            {invitation.targetKind === "contact"
                              ? "مقصد تماس محافظت‌شده"
                              : (invitation.inviteeDisplayName ?? "نام نمایشی ثبت نشده")}
                          </strong>
                        </div>
                        <span className={styles.statusBadge} data-status={invitation.status}>
                          {invitation.status}
                        </span>
                      </div>
                      <p>Inviter: {invitation.inviterDisplayName ?? "نام نمایشی ثبت نشده"}</p>
                      <div className={styles.activityMeta}>
                        {invitation.inviteePersonId ? (
                          <code title="Invitee Person ID">{invitation.inviteePersonId}</code>
                        ) : null}
                        <span>ایجاد: {formatPersianDateTime(invitation.createdAtUtc)}</span>
                        <span>انقضا: {formatPersianDateTime(invitation.expiresAtUtc)}</span>
                        {invitation.acceptedAtUtc ? (
                          <span>پذیرش: {formatPersianDateTime(invitation.acceptedAtUtc)}</span>
                        ) : null}
                        {invitation.declinedAtUtc ? (
                          <span>رد: {formatPersianDateTime(invitation.declinedAtUtc)}</span>
                        ) : null}
                        {invitation.revokedAtUtc ? (
                          <span>لغو: {formatPersianDateTime(invitation.revokedAtUtc)}</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className={referenceStyles.summaryRail} aria-label="خلاصه Circle">
          <section className={referenceStyles.summaryCard}>
            <span className={styles.eyebrow}>Privacy boundary</span>
            <h3>داده‌هایی که عمداً اینجا نیستند</h3>
            <div className={referenceStyles.summaryRow}>
              <span>×</span>
              <div>
                <strong>Period / Fertility</strong>
                <small>تاریخ پریود، باروری و phase context</small>
              </div>
            </div>
            <div className={referenceStyles.summaryRow}>
              <span>×</span>
              <div>
                <strong>Symptoms / Pain / Notes</strong>
                <small>هیچ symptom، pain یا private note</small>
              </div>
            </div>
            <div className={referenceStyles.summaryRow}>
              <span>×</span>
              <div>
                <strong>Raw contact target</strong>
                <small>شماره، ایمیل و invite contact hash</small>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <Link className={styles.ledgerHint} href="/relationships/circles">
        بازگشت به Circleها
      </Link>
    </div>
  );
}

async function CircleDetailContent({ circleId }: { circleId: string }) {
  const result = await getCircleDetail(circleId);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") {
    return (
      <AdminPageState
        state="forbidden"
        title="مجوز مشاهده این Circle وجود ندارد"
        description="برای مشاهده ساختار Circle مجوز relationships.read لازم است."
      />
    );
  }
  if (result.kind === "not_found") notFound();
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        title="جزئیات canonical Circle در دسترس نیست"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }
  return <CircleDetail data={result.data} />;
}

export default async function CircleDetailPage({ params }: CircleDetailPageProps) {
  const { circleId } = await params;
  if (!UUID_PATTERN.test(circleId)) notFound();
  const admin = await requireAdminAccess();
  const canReadRelationships = admin.permissions.includes("relationships.read");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="relationships"
        title="جزئیات Circle"
        subtitle="Membership، invitation و sharing metadata در مرز structure-only"
      >
        {!canReadRelationships ? (
          <AdminPageState
            state="forbidden"
            title="مجوز ورود به Circleها وجود ندارد"
            description="برای مشاهده این workspace مجوز relationships.read لازم است."
          />
        ) : (
          <Suspense
            fallback={
              <AdminPageState
                state="loading"
                title="در حال دریافت ساختار Circle"
                description="داده فقط از Admin API canonical بارگذاری می‌شود."
              />
            }
          >
            <CircleDetailContent circleId={circleId} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
