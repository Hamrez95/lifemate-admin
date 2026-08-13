import styles from "./admin-data-table.module.css";

export type AdminPageStateKind =
  "loading" | "empty" | "error" | "forbidden" | "stale" | "unavailable";

const copy: Record<AdminPageStateKind, { title: string; description: string }> = {
  loading: {
    title: "در حال دریافت اطلاعات",
    description: "اطلاعات این بخش در حال بارگذاری است.",
  },
  empty: {
    title: "موردی پیدا نشد",
    description: "با فیلترهای فعلی داده‌ای برای نمایش وجود ندارد.",
  },
  error: {
    title: "دریافت اطلاعات ناموفق بود",
    description: "در حال حاضر نمی‌توانیم این داده را نمایش دهیم. دوباره تلاش کنید.",
  },
  forbidden: {
    title: "دسترسی مجاز نیست",
    description: "برای مشاهده این بخش مجوز لازم را ندارید.",
  },
  stale: {
    title: "اطلاعات ممکن است به‌روز نباشد",
    description: "آخرین نسخه قابل اعتماد نمایش داده شده است.",
  },
  unavailable: {
    title: "اطلاعات در دسترس نیست",
    description: "منبع این داده در حال حاضر در دسترس یا متصل نیست.",
  },
};

export function AdminPageState({
  state,
  title,
  description,
}: {
  state: AdminPageStateKind;
  title?: string;
  description?: string;
}) {
  const content = copy[state];
  const isAlert = state === "error" || state === "forbidden";

  return (
    <section
      className={styles.statePanel}
      data-state={state}
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      aria-busy={state === "loading"}
    >
      <strong>{title ?? content.title}</strong>
      <p>{description ?? content.description}</p>
    </section>
  );
}
