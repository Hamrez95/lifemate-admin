import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPageState } from "@/src/components/admin-data-table";
import { AdminSessionProvider } from "@/src/components/auth/AdminSessionProvider";
import { AdminShell } from "@/src/components/shell/AdminShell";
import {
  getPrivacyCoverage,
  getPrivacyDirectory,
  type PrivacyCoverageResponse,
  type PrivacyDirectoryKind,
  type PrivacyDirectoryResponse,
} from "@/src/lib/admin-api/privacy-consent";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

import {
  createDocumentAction,
  publishDocumentAction,
  retireDocumentAction,
} from "./actions";
import styles from "./privacy.module.css";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Query = {
  view: PrivacyDirectoryKind;
  q: string;
  status: string;
  page: number;
  pageSize: number;
};

const views: readonly { key: PrivacyDirectoryKind; label: string; hint: string }[] = [
  { key: "documents", label: "اسناد قانونی", hint: "نسخه‌ها، وضعیت انتشار و لینک سند" },
  { key: "acceptances", label: "پذیرش قانونی", hint: "مدرک تغییرناپذیر پذیرش Terms و Privacy" },
  { key: "consents", label: "رضایت‌ها", hint: "رضایت‌های واقعی اشتراک‌گذاری و دسترسی" },
  {
    key: "preferences",
    label: "ترجیحات حریم خصوصی",
    hint: "انتخاب‌های اختیاری تبلیغ، تحقیق و شخصی‌سازی",
  },
];

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function int(value: string, fallback: number, max: number): number {
  if (!/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= max ? number : fallback;
}

function parseQuery(input: Record<string, string | string[] | undefined>): Query {
  const requested = one(input.view) as PrivacyDirectoryKind;
  const view = views.some((item) => item.key === requested) ? requested : "documents";
  const size = int(one(input.pageSize), 25, 100);
  return {
    view,
    q: one(input.q).trim().slice(0, 120),
    status: one(input.status).trim(),
    page: int(one(input.page), 1, 100_000),
    pageSize: [25, 50, 100].includes(size) ? size : 25,
  };
}

function params(query: Query, page = query.page): URLSearchParams {
  const value = new URLSearchParams({
    view: query.view,
    page: String(page),
    pageSize: String(query.pageSize),
  });
  if (query.q) value.set("q", query.q);
  if (query.status) value.set("status", query.status);
  return value;
}

function value(row: Record<string, unknown>, key: string): string {
  const item = row[key];
  return item == null ? "—" : String(item);
}

function date(row: Record<string, unknown>, key: string): string {
  const raw = row[key];
  if (typeof raw !== "string") return "—";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed);
}

function shortId(raw: unknown): string {
  return typeof raw === "string" && raw.length > 12
    ? `${raw.slice(0, 8)}…${raw.slice(-4)}`
    : String(raw ?? "—");
}

function Status({ children }: { children: string }) {
  return <span className={styles.status}>{children}</span>;
}

function DocumentRows({ data, canManage }: { data: PrivacyDirectoryResponse; canManage: boolean }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>سند</th>
            <th>نسخه</th>
            <th>حوزه</th>
            <th>وضعیت</th>
            <th>تعداد پذیرش</th>
            <th>آخرین تغییر</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((row) => {
            const id = value(row, "documentId");
            const status = value(row, "status");
            const uri = row.contentUri;
            return (
              <tr key={id}>
                <td>
                  <strong>{value(row, "title")}</strong>
                  <br />
                  <span className={styles.code}>{value(row, "purpose")}</span>
                </td>
                <td>{value(row, "version")}</td>
                <td>{value(row, "jurisdiction")}</td>
                <td>
                  <Status>{status}</Status>
                </td>
                <td>{Number(row.acceptanceCount ?? 0).toLocaleString("fa-IR")}</td>
                <td>{date(row, "updatedAtUtc")}</td>
                <td>
                  {status === "Draft" && canManage ? (
                    <form action={publishDocumentAction} className={styles.actions}>
                      <input type="hidden" name="documentId" value={id} />
                      <input
                        type="hidden"
                        name="expectedUpdatedAt"
                        value={value(row, "updatedAtUtc")}
                      />
                      <input type="hidden" name="reasonCode" value="approved_for_release" />
                      <button type="submit">انتشار نسخه</button>
                      {typeof uri === "string" && uri.startsWith("https://") ? (
                        <a className={styles.link} href={uri} target="_blank" rel="noreferrer">
                          بازبینی سند
                        </a>
                      ) : null}
                    </form>
                  ) : status === "Active" && canManage ? (
                    <form action={retireDocumentAction} className={styles.actions}>
                      <input type="hidden" name="documentId" value={id} />
                      <input
                        type="hidden"
                        name="expectedUpdatedAt"
                        value={value(row, "updatedAtUtc")}
                      />
                      <select
                        name="reasonCode"
                        aria-label="دلیل بازنشسته‌کردن سند"
                        defaultValue="superseded_version"
                      >
                        <option value="superseded_version">نسخه جدید جایگزین شده</option>
                        <option value="policy_withdrawn">سیاست کنار گذاشته شده</option>
                      </select>
                      <button type="submit">بازنشسته‌کردن</button>
                    </form>
                  ) : typeof uri === "string" && uri.startsWith("https://") ? (
                    <a className={styles.link} href={uri} target="_blank" rel="noreferrer">
                      مشاهده سند
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AcceptanceRows({ data }: { data: PrivacyDirectoryResponse }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>کاربر</th>
            <th>سند</th>
            <th>نسخه</th>
            <th>حوزه</th>
            <th>منبع</th>
            <th>زمان پذیرش</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((row, index) => (
            <tr key={`${value(row, "accountId")}-${value(row, "documentId")}-${index}`}>
              <td className={styles.code}>{shortId(row.accountId)}</td>
              <td>
                {value(row, "documentTitle")}
                <br />
                <span className={styles.code}>{value(row, "purpose")}</span>
              </td>
              <td>{value(row, "version")}</td>
              <td>{value(row, "jurisdiction")}</td>
              <td>{value(row, "source")}</td>
              <td>{date(row, "acceptedAtUtc")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsentRows({ data }: { data: PrivacyDirectoryResponse }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>فرد</th>
            <th>نوع رضایت</th>
            <th>Scope</th>
            <th>وضعیت</th>
            <th>دسته داده</th>
            <th>آخرین تغییر</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((row) => (
            <tr key={value(row, "consentRecordId")}>
              <td className={styles.code}>{shortId(row.subjectPersonId)}</td>
              <td>{value(row, "purpose")}</td>
              <td className={styles.code}>{value(row, "scopeKey")}</td>
              <td>
                <Status>{value(row, "status")}</Status>
              </td>
              <td>{Array.isArray(row.dataCategories) ? row.dataCategories.join("، ") : "—"}</td>
              <td>{date(row, "updatedAtUtc")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreferenceRows({ data }: { data: PrivacyDirectoryResponse }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>کاربر</th>
            <th>ترجیح</th>
            <th>گروه</th>
            <th>کانال</th>
            <th>وضعیت</th>
            <th>صریح؟</th>
            <th>آخرین تغییر</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((row, index) => (
            <tr key={`${value(row, "accountId")}-${value(row, "purpose")}-${index}`}>
              <td className={styles.code}>{shortId(row.accountId)}</td>
              <td>{value(row, "purpose")}</td>
              <td>{value(row, "category")}</td>
              <td>{value(row, "channel")}</td>
              <td>
                <Status>{row.enabled === true ? "فعال" : "غیرفعال"}</Status>
              </td>
              <td>{row.explicit === true ? "بله" : "پیش‌فرض"}</td>
              <td>{date(row, "updatedAtUtc")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoveragePanel({ coverage }: { coverage: PrivacyCoverageResponse }) {
  return (
    <section className={styles.panel} aria-labelledby="privacy-coverage-title">
      <header className={styles.panelHeader}>
        <h3 id="privacy-coverage-title">پوشش پذیرش نسخه‌های الزامی</h3>
        <span>{coverage.eligibleAccountCount.toLocaleString("fa-IR")} حساب فعال</span>
      </header>
      {coverage.items.length === 0 ? (
        <div className={styles.empty}>سند الزامی فعالی برای GLOBAL وجود ندارد.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Purpose</th>
                <th>نسخه</th>
                <th>حوزه</th>
                <th>پذیرفته‌شده</th>
                <th>واجد شرایط</th>
                <th>پوشش</th>
              </tr>
            </thead>
            <tbody>
              {coverage.items.map((item) => (
                <tr key={item.documentId}>
                  <td className={styles.code}>{item.purpose}</td>
                  <td>{item.version}</td>
                  <td>{item.jurisdiction}</td>
                  <td>{item.acceptedCount.toLocaleString("fa-IR")}</td>
                  <td>{item.eligibleAccountCount.toLocaleString("fa-IR")}</td>
                  <td>{item.coveragePercent.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CreateDocumentPanel() {
  return (
    <section className={styles.panel} aria-labelledby="privacy-create-title">
      <header className={styles.panelHeader}>
        <h3 id="privacy-create-title">نسخه Draft جدید</h3>
        <span>ایجاد Draft به معنی پذیرش کاربر یا انتشار نیست</span>
      </header>
      <form className={styles.filters} action={createDocumentAction}>
        <label>
          نوع سند
          <select name="purpose" defaultValue="privacy_notice" required>
            <option value="privacy_notice">Privacy Notice</option>
            <option value="legal_terms">Terms</option>
          </select>
        </label>
        <label>
          نسخه
          <input name="version" required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,63}" />
        </label>
        <label>
          حوزه
          <input name="jurisdiction" defaultValue="GLOBAL" required maxLength={16} />
        </label>
        <label>
          عنوان
          <input name="title" required minLength={3} maxLength={200} />
        </label>
        <label>
          SHA / hash سند
          <input name="documentHash" required minLength={32} maxLength={128} pattern="[0-9a-fA-F]{32,128}" />
        </label>
        <label>
          لینک HTTPS سند
          <input name="contentUri" type="url" required pattern="https://.*" />
        </label>
        <label>
          زمان اثرگذاری (تهران)
          <input name="effectiveAtLocal" type="datetime-local" required />
        </label>
        <input type="hidden" name="reasonCode" value="new_legal_version" />
        <button type="submit">ساخت Draft</button>
      </form>
    </section>
  );
}

function Rows({
  data,
  query,
  canManage,
}: {
  data: PrivacyDirectoryResponse;
  query: Query;
  canManage: boolean;
}) {
  if (data.items.length === 0) {
    return <div className={styles.empty}>موردی برای این فیلتر پیدا نشد.</div>;
  }
  if (query.view === "documents") return <DocumentRows data={data} canManage={canManage} />;
  if (query.view === "acceptances") return <AcceptanceRows data={data} />;
  if (query.view === "consents") return <ConsentRows data={data} />;
  return <PreferenceRows data={data} />;
}

function statusOptions(view: PrivacyDirectoryKind): string[] {
  if (view === "documents") return ["Draft", "Active", "Retired"];
  if (view === "consents") return ["Granted", "Revoked", "Expired", "Superseded"];
  if (view === "preferences") return ["Enabled", "Disabled"];
  return [];
}

async function PrivacyContent({ query, canManage }: { query: Query; canManage: boolean }) {
  const apiParams = params(query);
  apiParams.delete("view");
  const result = await getPrivacyDirectory(query.view, apiParams);
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") return <AdminPageState state="forbidden" />;
  if (result.kind === "invalid") return <AdminPageState state="error" title="فیلتر نامعتبر است" />;
  if (result.kind === "unavailable") {
    return (
      <AdminPageState
        state="unavailable"
        description={result.correlationId ? `کد پیگیری: ${result.correlationId}` : undefined}
      />
    );
  }

  const coverageResult = query.view === "documents" ? await getPrivacyCoverage("GLOBAL") : null;
  const data = result.data;
  const selected = views.find((item) => item.key === query.view)!;
  const previous = data.page > 1 ? `/privacy?${params(query, data.page - 1)}` : null;
  const next =
    data.page * data.pageSize < data.total ? `/privacy?${params(query, data.page + 1)}` : null;
  const statuses = statusOptions(query.view);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span>Privacy & Consent Control Plane</span>
          <h2>حریم خصوصی باید قابل مشاهده باشد؛ رضایت پزشکی نباید قابل جعل باشد.</h2>
          <p>
            این صفحه اسناد قانونی، پذیرش کاربران، رضایت‌های واقعی و ترجیحات اختیاری را جدا نگه
            می‌دارد. رضایت Care/Women/Health از اینجا فقط خوانده می‌شود و با یک کلید ساده تغییر
            نمی‌کند.
          </p>
        </div>
        <div className={styles.heroBadge}>
          <strong>{data.total.toLocaleString("fa-IR")}</strong>
          <span>{selected.label}</span>
        </div>
      </section>

      <nav className={styles.tabs} aria-label="بخش‌های حریم خصوصی">
        {views.map((item) => (
          <Link
            className={styles.tab}
            data-active={query.view === item.key ? "true" : "false"}
            href={`/privacy?view=${item.key}`}
            key={item.key}
            title={item.hint}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.notice}>
        {selected.hint} · آخرین دریافت: {dateFormatter.format(new Date(data.freshness.asOfUtc))}
      </div>

      {query.view === "documents" && canManage ? <CreateDocumentPanel /> : null}
      {coverageResult?.kind === "ok" ? <CoveragePanel coverage={coverageResult.data} /> : null}
      {query.view === "documents" && coverageResult && coverageResult.kind !== "ok" ? (
        <div className={styles.notice}>
          پوشش پذیرش در حال حاضر قابل دریافت نیست؛ فهرست اسناد همچنان از قرارداد canonical نمایش داده می‌شود.
        </div>
      ) : null}

      <form className={styles.filters} action="/privacy">
        <input type="hidden" name="view" value={query.view} />
        <input type="hidden" name="page" value="1" />
        <label>
          جست‌وجو
          <input name="q" defaultValue={query.q} placeholder="عنوان، purpose یا شناسه" />
        </label>
        {statuses.length > 0 ? (
          <label>
            وضعیت
            <select name="status" defaultValue={query.status}>
              <option value="">همه</option>
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          تعداد
          <select name="pageSize" defaultValue={String(query.pageSize)}>
            <option value="25">۲۵</option>
            <option value="50">۵۰</option>
            <option value="100">۱۰۰</option>
          </select>
        </label>
        <button type="submit">اعمال فیلتر</button>
      </form>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h3>{selected.label}</h3>
          <span>{data.total.toLocaleString("fa-IR")} مورد</span>
        </header>
        <Rows data={data} query={query} canManage={canManage} />
        <footer className={styles.pager}>
          <span>صفحه {data.page.toLocaleString("fa-IR")}</span>
          <div>
            {previous ? <Link href={previous}>قبلی</Link> : null}{" "}
            {next ? <Link href={next}>بعدی</Link> : null}
          </div>
        </footer>
      </section>
    </div>
  );
}

export default async function PrivacyPage({ searchParams }: PageProps) {
  const admin = await requireAdminAccess();
  const query = parseQuery(await searchParams);
  const canRead = admin.permissions.includes("privacy.consent.read");
  const canManage = admin.permissions.includes("privacy.consent.manage");

  return (
    <AdminSessionProvider admin={admin}>
      <AdminShell
        activeSlug="privacy"
        title="حریم خصوصی و رضایت"
        subtitle="اسناد قانونی، پذیرش، Consent و Preference به‌صورت جدا و قابل ممیزی"
      >
        {!canRead ? (
          <AdminPageState state="forbidden" />
        ) : (
          <Suspense
            fallback={<AdminPageState state="loading" title="در حال دریافت اطلاعات حریم خصوصی" />}
          >
            <PrivacyContent query={query} canManage={canManage} />
          </Suspense>
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
