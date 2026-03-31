"use client";

import { useEffect, useId } from "react";

import Image from "next/image";

type ModalShellProps = {
  bodyClassName?: string;
  children: React.ReactNode;
  closeLabel?: string;
  isOpen: boolean;
  onClose: () => void;
  panelClassName?: string;
  title: React.ReactNode;
};

export function ModalShell({
  bodyClassName,
  children,
  closeLabel = "Close dialog",
  isOpen,
  onClose,
  panelClassName,
  title,
}: ModalShellProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const panelClasses = ["modal-panel", panelClassName].filter(Boolean).join(" ");
  const bodyClasses = ["modal-body", bodyClassName].filter(Boolean).join(" ");

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={panelClasses}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id={titleId}>
              {title}
            </h2>
          </div>
          <button
            aria-label={closeLabel}
            className="modal-close"
            onClick={onClose}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="modal-close-icon"
              height={24}
              src="/icons/close.svg"
              style={{ filter: "brightness(0) invert(1)" }}
              width={24}
            />
          </button>
        </div>

        <div className={bodyClasses}>{children}</div>
      </div>
    </div>
  );
}
