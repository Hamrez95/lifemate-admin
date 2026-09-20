"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./primitives.module.css";

type OverlayProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
};

function useNativeDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onOpenChange(false);
    };
    const onClose = () => {
      if (open) onOpenChange(false);
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onClose);
    };
  }, [onOpenChange, open]);

  return ref;
}

function useDismissibleDisclosure(open: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onDismiss, open]);

  return ref;
}

export function Dialog({
  children,
  open,
  onOpenChange,
  title,
  description,
  className = "",
}: OverlayProps) {
  const headingId = useId();
  const descriptionId = useId();
  const ref = useNativeDialog(open, onOpenChange);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${className}`}
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className={styles.overlayHeader}>
        <div>
          <h2 id={headingId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <button type="button" className={styles.overlayClose} onClick={() => onOpenChange(false)}>
          <span aria-hidden="true">×</span>
          <span className={styles.srOnly}>بستن</span>
        </button>
      </div>
      <div className={styles.overlayBody}>{children}</div>
    </dialog>
  );
}

export function Drawer({
  children,
  open,
  onOpenChange,
  title,
  description,
  className = "",
}: OverlayProps) {
  const headingId = useId();
  const descriptionId = useId();
  const ref = useNativeDialog(open, onOpenChange);

  return (
    <dialog
      ref={ref}
      className={`${styles.drawer} ${className}`}
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className={styles.overlayHeader}>
        <div>
          <h2 id={headingId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <button type="button" className={styles.overlayClose} onClick={() => onOpenChange(false)}>
          <span aria-hidden="true">×</span>
          <span className={styles.srOnly}>بستن</span>
        </button>
      </div>
      <div className={styles.overlayBody}>{children}</div>
    </dialog>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const tooltipId = useId();
  return (
    <span className={styles.tooltipTrigger} aria-describedby={tooltipId}>
      {children}
      <span id={tooltipId} role="tooltip" className={styles.tooltipContent}>
        {label}
      </span>
    </span>
  );
}

export function Popover({
  label,
  children,
  content,
}: {
  label: string;
  children: ReactNode;
  content: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const ref = useDismissibleDisclosure(open, () => setOpen(false));
  return (
    <span ref={ref} className={styles.popover}>
      <button
        type="button"
        className={styles.popoverTrigger}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        {children}
        <span className={styles.srOnly}>{label}</span>
      </button>
      {open ? (
        <span id={contentId} className={styles.popoverContent} role="dialog" aria-label={label}>
          {content}
        </span>
      ) : null}
    </span>
  );
}

export function Menu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const ref = useDismissibleDisclosure(open, () => setOpen(false));
  return (
    <span ref={ref} className={styles.menu}>
      <button
        type="button"
        className={styles.menuTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <span id={menuId} className={styles.menuContent} role="menu" aria-label={label}>
          {children}
        </span>
      ) : null}
    </span>
  );
}

export function MenuItem({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} type={props.type ?? "button"} role="menuitem" className={styles.menuItem}>
      {children}
    </button>
  );
}

export function Combobox({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className={styles.combobox} htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
