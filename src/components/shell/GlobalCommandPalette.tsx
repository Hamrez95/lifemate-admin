"use client";

import { useRouter } from "next/navigation";
import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAdminSession } from "@/src/components/auth/AdminSessionProvider";
import type {
  GlobalSearchData,
  SearchDomain,
  SearchGroup,
  SearchItem,
} from "@/src/lib/admin-api/global-search";

import styles from "./global-command-palette.module.css";

type PaletteState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: GlobalSearchData }
  | { kind: "forbidden" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "error"; message: string };

type StaticCommand = {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  permission?: string;
};

type RecentCommand = Pick<StaticCommand, "key" | "title" | "href">;

const RECENTS_KEY = "lifemate.command-palette.recent-safe-commands.v1";
const MAX_RECENTS = 6;

const domainLabels: Record<SearchDomain, string> = {
  users: "کاربران",
  support: "پشتیبانی",
  commerce: "تجارت",
  campaigns: "کمپین‌ها",
};

const domainPermissions: Record<SearchDomain, string> = {
  users: "users.read.basic",
  support: "support.read",
  commerce: "commerce.read",
  campaigns: "marketing.read",
};

const staticCommands: StaticCommand[] = [
  {
    key: "users",
    title: "کاربران",
    subtitle: "دایرکتوری و User 360",
    href: "/users",
    permission: "users.read.basic",
  },
  {
    key: "support",
    title: "پشتیبانی",
    subtitle: "صف و جزئیات تیکت‌ها",
    href: "/support",
    permission: "support.read",
  },
  {
    key: "commerce",
    title: "تجارت",
    subtitle: "Plan، Entitlement، تراکنش و پروموشن",
    href: "/commerce",
    permission: "commerce.read",
  },
  {
    key: "analytics",
    title: "تحلیل داده",
    subtitle: "KPIهای تأییدشده محصول",
    href: "/analytics",
    permission: "analytics.read",
  },
  {
    key: "relationships",
    title: "روابط و رضایت",
    subtitle: "Relationship، Consent و Access Grant",
    href: "/relationships",
    permission: "relationships.read",
  },
];

function safeRecent(value: unknown, allowed: readonly StaticCommand[]): RecentCommand[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map(allowed.map((command) => [command.key, command]));
  const result: RecentCommand[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const key = (candidate as { key?: unknown }).key;
    if (typeof key !== "string") continue;
    const command = byKey.get(key);
    if (!command || result.some((item) => item.key === key)) continue;
    result.push({ key: command.key, title: command.title, href: command.href });
    if (result.length >= MAX_RECENTS) break;
  }
  return result;
}

function highlight(text: string, query: string): ReactNode {
  const normalized = query.trim().toLocaleLowerCase("fa-IR");
  if (!normalized) return text;
  const source = text.toLocaleLowerCase("fa-IR");
  const index = source.indexOf(normalized);
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.trim().length)}</mark>
      {text.slice(index + query.trim().length)}
    </>
  );
}

function flatten(groups: SearchGroup[]): SearchItem[] {
  return groups.flatMap((group) => group.items);
}

function parseSearchPayload(value: unknown): GlobalSearchData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Partial<GlobalSearchData>;
  if (
    !Array.isArray(body.groups) ||
    typeof body.page !== "number" ||
    typeof body.pageSize !== "number"
  ) {
    return null;
  }
  if (!body.freshness || (body.freshness.status !== "fresh" && body.freshness.status !== "stale")) {
    return null;
  }
  return body as GlobalSearchData;
}

export function GlobalCommandPalette() {
  const router = useRouter();
  const admin = useAdminSession();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<PaletteState>({ kind: "idle" });
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState<RecentCommand[]>([]);

  const permissionSet = useMemo(() => new Set(admin.permissions), [admin.permissions]);
  const commands = useMemo(
    () =>
      staticCommands.filter(
        (command) => !command.permission || permissionSet.has(command.permission),
      ),
    [permissionSet],
  );
  const domains = useMemo(
    () =>
      (Object.keys(domainPermissions) as SearchDomain[]).filter((domain) =>
        permissionSet.has(domainPermissions[domain]),
      ),
    [permissionSet],
  );

  const resultItems = state.kind === "ready" ? flatten(state.data.groups) : [];
  const searchable = domains.length > 0;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setPage(1);
    setState({ kind: "idle" });
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(RECENTS_KEY);
        setRecents(safeRecent(raw ? JSON.parse(raw) : [], commands));
      } catch {
        setRecents([]);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [commands, open]);

  useEffect(() => {
    if (!open || query.trim().length < 3 || !searchable) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState({ kind: "loading" });
      const params = new URLSearchParams({
        q: query.trim(),
        types: domains.join(","),
        page: String(page),
        pageSize: "5",
      });
      try {
        const response = await fetch(`/api/admin/search?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        if (response.status === 429) {
          const body = (await response.json()) as { retryAfterSeconds?: unknown };
          setState({
            kind: "rate_limited",
            retryAfterSeconds:
              typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : 60,
          });
          return;
        }
        if (!response.ok) {
          setState({ kind: "error", message: "جست‌وجوی امن فعلاً در دسترس نیست." });
          return;
        }
        const data = parseSearchPayload(await response.json());
        setState(
          data ? { kind: "ready", data } : { kind: "error", message: "پاسخ جست‌وجو معتبر نبود." },
        );
        setActiveIndex(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setState({ kind: "error", message: "ارتباط با جست‌وجوی امن برقرار نشد." });
        }
      }
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [domains, open, page, query, searchable]);

  const rememberSafeCommand = (command: StaticCommand) => {
    const next = [
      { key: command.key, title: command.title, href: command.href },
      ...recents.filter((item) => item.key !== command.key),
    ].slice(0, MAX_RECENTS);
    setRecents(next);
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next.map(({ key }) => ({ key }))));
    } catch {
      // Local recent history is optional and never blocks navigation.
    }
  };

  const navigate = (href: string) => {
    close();
    router.push(href);
  };

  const selectCommand = (command: StaticCommand) => {
    rememberSafeCommand(command);
    navigate(command.href);
  };

  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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
      return;
    }
    if (!resultItems.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((value) => (value + 1) % resultItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((value) => (value - 1 + resultItems.length) % resultItems.length);
    } else if (event.key === "Enter" && document.activeElement === inputRef.current) {
      event.preventDefault();
      const item = resultItems[activeIndex];
      if (item) navigate(item.href);
    }
  };

  const hasNextPage =
    state.kind === "ready" &&
    state.data.groups.some(
      (group) =>
        group.availability === "ready" &&
        group.total !== null &&
        group.page * group.pageSize < group.total,
    );

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden="true">⌕</span>
        <span>جست‌وجو و فرمان</span>
        <kbd>⌘/Ctrl K</kbd>
      </button>

      {open ? (
        <div className={styles.backdrop} role="presentation" onMouseDown={close}>
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={onDialogKeyDown}
          >
            <header className={styles.header}>
              <div>
                <span>LifeMate Command Center</span>
                <h2 id="command-palette-title">جست‌وجوی امن و فرمان سریع</h2>
              </div>
              <button
                type="button"
                onClick={close}
                className={styles.closeButton}
                aria-label="بستن"
              >
                Esc
              </button>
            </header>

            <div className={styles.searchBox}>
              <span aria-hidden="true">⌕</span>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="حداقل ۳ نویسه؛ کاربر، تیکت، تجارت یا کمپین…"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="command-search-results"
                aria-expanded={query.trim().length >= 3}
              />
            </div>

            <div id="command-search-results" className={styles.body} role="listbox">
              {query.trim().length < 3 ? (
                <>
                  {recents.length > 0 ? (
                    <section className={styles.group} aria-labelledby="recent-command-title">
                      <div className={styles.groupTitle}>
                        <h3 id="recent-command-title">مسیرهای اخیر غیرحساس</h3>
                        <small>
                          فقط workspaceهای ثابت ذخیره می‌شوند؛ نه query و نه شناسه رکورد.
                        </small>
                      </div>
                      <div className={styles.commandGrid}>
                        {recents.map((recent) => (
                          <button
                            key={recent.key}
                            type="button"
                            onClick={() => navigate(recent.href)}
                          >
                            <strong>{recent.title}</strong>
                            <span>{recent.href}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <section className={styles.group} aria-labelledby="quick-command-title">
                    <div className={styles.groupTitle}>
                      <h3 id="quick-command-title">فرمان‌های سریع</h3>
                      <small>براساس permission فعلی</small>
                    </div>
                    <div className={styles.commandGrid}>
                      {commands.map((command) => (
                        <button
                          key={command.key}
                          type="button"
                          onClick={() => selectCommand(command)}
                        >
                          <strong>{command.title}</strong>
                          <span>{command.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <p className={styles.hint}>
                    عبارت‌های جست‌وجو در تاریخچه local ذخیره نمی‌شوند. Raw Health و Women Health در
                    این جست‌وجو وجود ندارند.
                  </p>
                </>
              ) : !searchable ? (
                <div className={styles.state} role="status">
                  این حساب برای هیچ‌یک از دامنه‌های جست‌وجوی سراسری مجوز خواندن ندارد.
                </div>
              ) : state.kind === "loading" ? (
                <div className={styles.state} role="status" aria-live="polite">
                  در حال جست‌وجوی امن…
                </div>
              ) : state.kind === "forbidden" ? (
                <div className={styles.state} role="alert">
                  دسترسی به دامنه‌های انتخاب‌شده مجاز نیست.
                </div>
              ) : state.kind === "rate_limited" ? (
                <div className={styles.state} role="status">
                  تعداد جست‌وجوها زیاد شده است؛ حدود{" "}
                  {state.retryAfterSeconds.toLocaleString("fa-IR")} ثانیه بعد دوباره تلاش کن.
                </div>
              ) : state.kind === "error" ? (
                <div className={styles.state} role="alert">
                  {state.message}
                </div>
              ) : state.kind === "ready" ? (
                <>
                  {state.data.freshness.status === "stale" ? (
                    <div className={styles.stale} role="status">
                      هشدار: snapshot جست‌وجو قدیمی است.
                    </div>
                  ) : null}
                  {state.data.groups.every(
                    (group) => group.availability !== "ready" || group.items.length === 0,
                  ) ? (
                    <div className={styles.state} role="status">
                      نتیجه‌ای در دامنه‌های مجاز پیدا نشد.
                    </div>
                  ) : null}
                  {state.data.groups.map((group) => (
                    <section className={styles.group} key={group.domain}>
                      <div className={styles.groupTitle}>
                        <h3>{domainLabels[group.domain]}</h3>
                        <small>
                          {group.availability === "ready" && group.total !== null
                            ? `${group.total.toLocaleString("fa-IR")} نتیجه`
                            : "منبع هنوز instrument نشده"}
                        </small>
                      </div>
                      {group.availability === "unavailable" ? (
                        <div className={styles.unavailable}>
                          این دامنه هنوز منبع canonical جست‌وجو ندارد.
                        </div>
                      ) : (
                        <div className={styles.results}>
                          {group.items.map((item) => {
                            const flatIndex = resultItems.findIndex(
                              (candidate) =>
                                candidate.domain === item.domain &&
                                candidate.id === item.id &&
                                candidate.kind === item.kind,
                            );
                            return (
                              <button
                                key={`${item.domain}:${item.kind}:${item.id}`}
                                type="button"
                                role="option"
                                aria-selected={flatIndex === activeIndex}
                                data-active={flatIndex === activeIndex}
                                onMouseEnter={() => setActiveIndex(flatIndex)}
                                onClick={() => navigate(item.href)}
                              >
                                <div>
                                  <strong>{highlight(item.title, query)}</strong>
                                  {item.subtitle ? (
                                    <span>{highlight(item.subtitle, query)}</span>
                                  ) : null}
                                </div>
                                <div className={styles.meta}>
                                  {item.badge ? <span>{item.badge}</span> : null}
                                  {item.status ? <small>{item.status}</small> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  ))}
                  {page > 1 || hasNextPage ? (
                    <div className={styles.pagination}>
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                      >
                        صفحه قبل
                      </button>
                      <span>صفحه {page.toLocaleString("fa-IR")}</span>
                      <button
                        type="button"
                        disabled={!hasNextPage}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        صفحه بعد
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <footer className={styles.footer}>
              <span>↑↓ حرکت · Enter بازکردن · Esc بستن</span>
              <span>نتایج فقط از permissionهای فعلی برمی‌گردند.</span>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
