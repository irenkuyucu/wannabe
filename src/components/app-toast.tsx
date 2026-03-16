"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type AppToastProps = {
  className?: string;
  closeLabel?: string;
  message: ReactNode;
  onDismiss: () => void;
  variant: "error" | "success" | "warning";
};

export function AppToast({
  className,
  closeLabel = "Dismiss notification",
  message,
  onDismiss,
  variant,
}: AppToastProps) {
  const classes = ["app-toast", `app-toast-${variant}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="alert">
      <p className="app-toast-message">{message}</p>
      <button
        aria-label={closeLabel}
        className="app-toast-close"
        onClick={onDismiss}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="toast-close-icon"
          height={20}
          src="/icons/close.svg"
          width={20}
        />
      </button>
    </div>
  );
}
