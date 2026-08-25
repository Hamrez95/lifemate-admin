import Image from "next/image";

import styles from "./admin-data-table.module.css";

export type AdminPageStateKind =
  | "loading"
  | "empty"
  | "success"
  | "error"
  | "forbidden"
  | "stale"
  | "unavailable";

const copy: Record<AdminPageStateKind, { title: string; description: string }> = {
  loading: {
    title: "در حال بارگذاری…",
    description: "",
  },
  empty: {
    title: "موردی برای نمایش نیست",
    description: "با فیلترهای فعلی داده‌ای پیدا نشد.",
  },
  success: {
    title: "انجام شد",
    description: "تغییر با موفقیت ثبت شد.",
  },
  error: {
    title: "این بخش بارگذاری نشد",
    description: "دوباره تلاش کنید.",
  },
  forbidden: {
    title: "دسترسی ندارید",
    description: "مجوز لازم برای این بخش وجود ندارد.",
  },
  stale: {
    title: "اطلاعات ممکن است به‌روز نباشد",
    description: "آخرین نسخه قابل اعتماد نمایش داده شده است.",
  },
  unavailable: {
    title: "منبع در دسترس نیست",
    description: "اتصال canonical فعلاً پاسخ نمی‌دهد.",
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
  const resolvedDescription = description ?? content.description;
  const isAlert = state === "error" || state === "forbidden";
  const showArtwork = state === "empty" || state === "success";

  return (
    <section
      className={styles.statePanel}
      data-state={state}
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      aria-busy={state === "loading"}
    >
      {showArtwork ? (
        <Image
          className={styles.stateArtwork}
          src="/design-assets/empty-success-sprout-v1.png"
          alt=""
          width={112}
          height={112}
          sizes="112px"
        />
      ) : null}
      {state === "loading" ? (
        <div className={styles.stateSkeleton} aria-hidden="true">
          <span />
          <span />
        </div>
      ) : null}
      <strong>{title ?? content.title}</strong>
      {resolvedDescription ? <p>{resolvedDescription}</p> : null}
    </section>
  );
}
