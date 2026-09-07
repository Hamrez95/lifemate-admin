import { cloneElement, useId, type ReactElement } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import styles from "./primitives.module.css";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

export function Surface({
  children,
  density = "comfortable",
  className = "",
}: {
  children: ReactNode;
  density?: "comfortable" | "compact";
  className?: string;
}) {
  return (
    <section className={`${styles.surface} ${className}`} data-density={density}>
      {children}
    </section>
  );
}

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.page} ${className}`}>{children}</div>;
}

export function Workspace({
  children,
  className = "",
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section className={`${styles.workspace} ${className}`} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

export function Section({
  children,
  className = "",
  title,
  description,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`${styles.section} ${className}`}>
      {title ? (
        <header className={styles.sectionHeader}>
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Toolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.toolbar} ${className}`}>{children}</div>;
}

export function FilterBar({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action: string;
  className?: string;
}) {
  return (
    <form className={`${styles.filterBar} ${className}`} action={action} method="get" role="search">
      {children}
    </form>
  );
}

export function SplitPane({
  primary,
  secondary,
  className = "",
}: {
  primary: ReactNode;
  secondary: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.splitPane} ${className}`}>
      <div>{primary}</div>
      <aside>{secondary}</aside>
    </div>
  );
}

export function Button({
  children,
  variant = "secondary",
  busy = false,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "subtle" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      className={`${styles.button} ${className}`}
      data-variant={variant}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? "در حال انجام…" : children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button {...props} className={`${styles.iconButton} ${className}`} aria-label={label}>
      {children}
    </button>
  );
}

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement;
}) {
  const id = `field-${useId()}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  const control = cloneElement(children as ReactElement<FieldControlProps>, {
    id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : undefined,
  });
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      {control}
      {hint ? <small id={hintId}>{hint}</small> : null}
      {error ? (
        <small id={errorId} role="alert" data-error="true">
          {error}
        </small>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${styles.input} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${styles.textarea} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${styles.select} ${props.className ?? ""}`} />;
}

export function Tabs({
  label,
  tabs,
  className = "",
}: {
  label: string;
  tabs: readonly { label: string; href: string; current?: boolean; count?: number }[];
  className?: string;
}) {
  return (
    <nav className={`${styles.tabs} ${className}`} aria-label={label}>
      {tabs.map((tab) => (
        <a key={tab.href} href={tab.href} aria-current={tab.current ? "page" : undefined}>
          {tab.label}
          {typeof tab.count === "number" ? <span>{tab.count.toLocaleString("fa-IR")}</span> : null}
        </a>
      ))}
    </nav>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "info" | "warning" | "danger";
}) {
  return (
    <span className={styles.statusBadge} data-tone={tone}>
      {children}
    </span>
  );
}
