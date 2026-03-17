"use client";

import type { ReactNode } from "react";

type ToastProps = {
  className?: string;
  closeLabel?: string;
  message: ReactNode;
  onDismiss: () => void;
  variant: "error" | "success" | "warning";
};

export function Toast({
  className,
  closeLabel = "Dismiss notification",
  message,
  onDismiss,
  variant,
}: ToastProps) {
  const classes = ["toast", `toast-${variant}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="alert">
      <p className="toast-body">{message}</p>
      <button
        aria-label={closeLabel}
        className="toast-close"
        onClick={onDismiss}
        type="button"
      >
        <img
          alt=""
          aria-hidden="true"
          className="toast-close-icon"
          src="/icons/close.svg"
        />
      </button>
    </div>
  );
}
