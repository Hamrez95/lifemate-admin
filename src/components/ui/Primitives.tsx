import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

import styles from "./primitives.module.css";

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

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const id = `field-${label.replace(/\s+/g, "-")}`;
  return (
    <label className={styles.field} htmlFor={id}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
      {error ? (
        <small role="alert" data-error="true">
          {error}
        </small>
      ) : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${styles.input} ${props.className ?? ""}`} />;
}
