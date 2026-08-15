"use client";

import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAdminSession } from "@/src/components/auth/AdminSessionProvider";
import type {
  NotificationAlert,
  NotificationCenterData,
  NotificationCountData,
  NotificationSeverity,
  NotificationSource,
} from "@/src/lib/admin-api/notifications";

import styles from "./notification-center.module.css";

type CountState =
  | { kind: "idle" | "loading" }
  | { kind: "ready"; data: NotificationCountData }
  | { kind: "forbidden" }
  | { kind: "error" };

type PanelState =
  | { kind: "idle" | "loading" }
  | { kind: "ready"; data: NotificationCenterData }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

const sourcePermissions: Record<NotificationSource, string> = {
  support: "support.read",
  security: "security.audit.read",
  operations: "operations.read",
  finance: "finance.read",
  product: "analytics.read",
};

const sourceLabels: Record<NotificationSource, string> = {
  support: "پشتیبانی",
  security: "امنیت",
  operations: "عملیات",
  finance: "مالی",
  product: "محصول",
};

const sourceIcons: Record<NotificationSource, string> = {
  support: "◌",
  security: "◇",
  operations: "↻",
  finance: "₮",
  product: "⌁",
};

const severityLabels: Record<NotificationSeverity, string> = {
  info: "اطلاع",
  warning: "نیاز به توجه",
  critical: "مهم",
};

const severityIcons: Record<NotificationSeverity, string> = {
  info: "i",
  warning: "!",
  critical: "!!",
};

const numberFormat = new Intl.NumberFormat("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function notificationData(value: unknown): NotificationCenterData | null {
  if (!isObject(value) || !Array.isArray(value.items) || !Array.isArray(value.sourceStates)) {
    return null;
  }
  if (
    typeof value.page !== "number" ||
    typeof value.pageSize !== "number" ||
    typeof value.knownTotal !== "number" ||
    typeof value.knownUnreadCount !== "number" ||
    (value.total !== null && typeof value.total !== "number") ||
    (value.unreadCount !== null && typeof value.unreadCount !== "number") ||
    (value.completeness !== "complete" && value.completeness !== "partial") ||
    typeof value.asOfUtc !== "string"
  ) {
    return null;
  }
  return value as unknown as NotificationCenterData;
}

function countData(value: unknown): NotificationCountData | null {
  if (!isObject(value) || !Array.isArray(value.sourceStates)) return null;
  if (
    typeof value.knownUnreadCount !== "number" ||
    (value.unreadCount !== null && typeof value.unreadCount !== "number") ||
    (value.completeness !== "complete" && value.completeness !== "partial") ||
    typeof value.asOfUtc !== "string"
  ) {
    return null;
  }
  return value as unknown as NotificationCountData;
}

function stale(iso: string): boolean {
  const timestamp = Date.parse(iso);
  return Number.isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000;
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "—" : dateFormat.format(new Date(timestamp));
}

function countLabel(data: NotificationCountData): string | null {
  if (data.completeness === "complete") {
    const exact = data.unreadCount ?? 0;
    return exact > 0 ? numberFormat.format(exact) : null;
  }
  if (data.knownUnreadCount > 0) return `${numberFormat.format(data.knownUnreadCount)}+`;
  return "•";
}

export function NotificationCenter() {
  const admin = useAdminSession();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [countState, setCountState] = useState<CountState>({ kind: "idle" });
  const [panelState, setPanelState] = useState<PanelState>({ kind: "idle" });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const permissionSet = useMemo(() => new Set(admin.permissions), [admin.permissions]);
  const sources = useMemo(
    () =>
      (Object.keys(sourcePermissions) as NotificationSource[]).filter((source) =>
        permissionSet.has(sourcePermissions[source]),
      ),
    [permissionSet],
  );
  const sourceQuery = sources.join(",");
  const enabled = sources.length > 0;

  const loadCount = useCallback(async () => {
    if (!enabled) return;
    setCountState({ kind: "loading" });
    try {
      const params = new URLSearchParams({ sources: sourceQuery });
      const response = await fetch(`/api/admin/notifications/count?${params.toString()}`, {
        cache: "no-store",
      });
      if (response.status === 403) {
        setCountState({ kind: "forbidden" });
        return;
      }
      if (!response.ok) {
        setCountState({ kind: "error" });
        return;
      }
      const data = countData(await response.json());
      setCountState(data ? { kind: "ready", data } : { kind: "error" });
    } catch {
      setCountState({ kind: "error" });
    }
  }, [enabled, sourceQuery]);

  const loadPanel = useCallback(async () => {
    if (!enabled) return;
    setPanelState({ kind: "loading" });
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "12",
      sources: sourceQuery,
      unreadOnly: String(unreadOnly),
    });
    try {
      const response = await fetch(`/api/admin/notifications?${params.toString()}`, {
        cache: "no-store",
      });
      if (response.status === 403) {
        setPanelState({ kind: "forbidden" });
        return;
      }
      if (!response.ok) {
        setPanelState({ kind: "error", message: "مرکز اعلان‌ها فعلاً در دسترس نیست." });
        return;
      }
      const data = notificationData(await response.json());
      setPanelState(
        data
          ? { kind: "ready", data }
          : { kind: "error", message: "پاسخ مرکز اعلان‌ها معتبر نبود." },
      );
    } catch {
      setPanelState({ kind: "error", message: "ارتباط با مرکز اعلان‌ها برقرار نشد." });
    }
  }, [enabled, page, sourceQuery, unreadOnly]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => void loadCount(), 0);
    return () => window.clearTimeout(timer);
  }, [enabled, loadCount]);

  useEffect(() => {
    if (!open || !enabled) return;
    const timer = window.setTimeout(() => void loadPanel(), 0);
    return () => window.clearTimeout(timer);
  }, [enabled, loadPanel, open]);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const setRead = async (alert: NotificationAlert, read: boolean) => {
    if (pendingKey) return;
    setPendingKey(alert.alertKey);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ alertKey: alert.alertKey, source: alert.source, read }),
      });
      if (!response.ok) {
        setPanelState({ kind: "error", message: "تغییر وضعیت خواندن اعلان انجام نشد." });
        return;
      }
      await Promise.all([loadPanel(), loadCount()]);
    } catch {
      setPanelState({ kind: "error", message: "تغییر وضعیت اعلان در دسترس نیست." });
    } finally {
      setPendingKey(null);
    }
  };

  const data = panelState.kind === "ready" ? panelState.data : null;
  const badge = countState.kind === "ready" ? countLabel(countState.data) : null;
  const badgeDescription =
    countState.kind === "ready"
      ? countState.data.completeness === "complete"
        ? `${numberFormat.format(countState.data.unreadCount ?? 0)} اعلان خوانده‌نشده`
        : `حداقل ${numberFormat.format(countState.data.knownUnreadCount)} اعلان خوانده‌نشده؛ برخی منابع ناقص‌اند`
      : "";
  const hasNext = data ? data.knownTotal > data.page * data.pageSize : false;

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.trigger}
        type="button"
        disabled={!enabled}
        aria-label={enabled ? `اعلان‌ها${badgeDescription ? `؛ ${badgeDescription}` : ""}` : "اعلان‌ها؛ دسترسی مجاز ندارید"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          void loadCount();
        }}
      >
        <span aria-hidden="true" className={styles.bell}>♧</span>
        {badge && <span className={styles.badge}>{badge}</span>}
      </button>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {badgeDescription}
      </span>

      {open && (
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <div
            ref={dialogRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-center-title"
            dir="rtl"
            onKeyDown={onDialogKeyDown}
          >
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>LifeMate Signals</span>
                <h2 id="notification-center-title">مرکز اعلان‌ها</h2>
                <p>فقط هشدارهای واقعی از دامنه‌هایی که اجازه دیدنشان را دارید.</p>
              </div>
              <button type="button" className={styles.close} onClick={close} aria-label="بستن اعلان‌ها">
                ×
              </button>
            </header>

            <div className={styles.toolbar} aria-label="فیلتر اعلان‌ها">
              <div className={styles.segmented}>
                <button
                  type="button"
                  data-active={!unreadOnly}
                  onClick={() => {
                    setUnreadOnly(false);
                    setPage(1);
                  }}
                >
                  همه
                </button>
                <button
                  type="button"
                  data-active={unreadOnly}
                  onClick={() => {
                    setUnreadOnly(true);
                    setPage(1);
                  }}
                >
                  خوانده‌نشده
                </button>
              </div>
              <button
                type="button"
                className={styles.refresh}
                onClick={() => void Promise.all([loadPanel(), loadCount()])}
                aria-label="به‌روزرسانی اعلان‌ها"
              >
                ↻ به‌روزرسانی
              </button>
            </div>

            {panelState.kind === "loading" && (
              <div className={styles.state} role="status">
                <span className={styles.spinner} aria-hidden="true" />
                <strong>در حال جمع‌کردن سیگنال‌های مجاز…</strong>
                <p>هر منبع مستقل بررسی می‌شود تا خرابی یک سرویس بقیه را پنهان نکند.</p>
              </div>
            )}

            {panelState.kind === "forbidden" && (
              <div className={styles.state} role="status">
                <strong>دسترسی به این منابع اعلان ندارید.</strong>
                <p>Badge هم وجود منابع غیرمجاز را افشا نمی‌کند.</p>
              </div>
            )}

            {panelState.kind === "error" && (
              <div className={styles.state} role="alert">
                <strong>{panelState.message}</strong>
                <button type="button" onClick={() => void loadPanel()}>تلاش دوباره</button>
              </div>
            )}

            {data && (
              <>
                <div className={styles.summaryStrip}>
                  <div>
                    <span>خوانده‌نشده</span>
                    <strong>
                      {data.completeness === "complete"
                        ? numberFormat.format(data.unreadCount ?? 0)
                        : `${numberFormat.format(data.knownUnreadCount)}+`}
                    </strong>
                  </div>
                  <div>
                    <span>وضعیت منابع</span>
                    <strong>{data.completeness === "complete" ? "کامل" : "بخشی"}</strong>
                  </div>
                  <div>
                    <span>آخرین snapshot</span>
                    <strong>{stale(data.asOfUtc) ? "قدیمی" : "تازه"}</strong>
                  </div>
                </div>

                {data.sourceStates.some((source) => source.state === "unavailable" || source.state === "not_instrumented") && (
                  <div className={styles.sourceStates} aria-label="وضعیت منابع اعلان">
                    {data.sourceStates
                      .filter((source) => source.state === "unavailable" || source.state === "not_instrumented")
                      .map((source) => (
                        <div key={source.source} data-state={source.state}>
                          <span aria-hidden="true">{sourceIcons[source.source]}</span>
                          <p>
                            <strong>{sourceLabels[source.source]}</strong>
                            {source.state === "unavailable"
                              ? " موقتاً در دسترس نیست؛ شمارش کل به‌صورت بخشی نمایش داده می‌شود."
                              : " هنوز منبع canonical هشدار ندارد؛ هیچ داده نمایشی ساخته نشده است."}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {data.items.length === 0 ? (
                  <div className={styles.empty} role="status">
                    <span aria-hidden="true">✓</span>
                    <strong>{unreadOnly ? "اعلان خوانده‌نشده‌ای در منابع آماده نیست." : "در منابع آماده هشدار فعالی نیست."}</strong>
                    <p>منابع unavailable یا not-instrumented بالا جداگانه و شفاف مشخص می‌شوند.</p>
                  </div>
                ) : (
                  <ol className={styles.list} aria-label="اعلان‌های مجاز">
                    {data.items.map((alert) => (
                      <li
                        key={alert.alertKey}
                        className={styles.alert}
                        data-severity={alert.severity}
                        data-read={alert.isRead}
                      >
                        <div className={styles.alertIcon} aria-hidden="true">
                          {severityIcons[alert.severity]}
                        </div>
                        <div className={styles.alertBody}>
                          <div className={styles.alertTopline}>
                            <span className={styles.sourcePill}>
                              <span aria-hidden="true">{sourceIcons[alert.source]}</span>
                              {sourceLabels[alert.source]}
                            </span>
                            <span className={styles.severity} data-severity={alert.severity}>
                              {severityLabels[alert.severity]}
                            </span>
                            {!alert.isRead && <span className={styles.unread}>جدید</span>}
                          </div>
                          <h3>{alert.title}</h3>
                          {alert.summary && <p>{alert.summary}</p>}
                          <div className={styles.meta}>
                            <time dateTime={alert.occurredAtUtc}>{formatDate(alert.occurredAtUtc)}</time>
                            <span>{stale(alert.freshnessAtUtc) ? "منبع قدیمی" : "منبع تازه"}</span>
                          </div>
                          <div className={styles.actions}>
                            {alert.deepLink && (
                              <Link href={alert.deepLink} onClick={close}>
                                مشاهده منبع
                              </Link>
                            )}
                            <button
                              type="button"
                              disabled={pendingKey === alert.alertKey}
                              onClick={() => void setRead(alert, !alert.isRead)}
                            >
                              {pendingKey === alert.alertKey
                                ? "در حال ثبت…"
                                : alert.isRead
                                ? "علامت‌گذاری به‌عنوان نخوانده"
                                : "خواندم"}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                <footer className={styles.footer}>
                  <span>
                    صفحه {numberFormat.format(data.page)} · {data.completeness === "partial" ? "شمارش کل بخشی است" : `${numberFormat.format(data.total ?? 0)} هشدار`}
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      قبلی
                    </button>
                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      بعدی
                    </button>
                  </div>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
