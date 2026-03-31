"use client";

import * as React from "react";

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: React.ReactNode;
  durationMs?: number;
  holdingLabel?: string;
  interaction?: "press" | "hold";
  onHoldComplete?: () => void | Promise<void>;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled = false,
      durationMs = 2000,
      holdingLabel,
      interaction = "press",
      onClick,
      onContextMenu,
      onHoldComplete,
      onPointerCancel,
      onPointerDown,
      onPointerLeave,
      onPointerUp,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isHoldButton = interaction === "hold";
    const [isHolding, setIsHolding] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const holdStartedAtRef = React.useRef<number | null>(null);
    const holdTimeoutRef = React.useRef<number | null>(null);
    const progressIntervalRef = React.useRef<number | null>(null);

    const clearTimers = React.useCallback(() => {
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }

      if (progressIntervalRef.current !== null) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, []);

    const resetHold = React.useCallback(() => {
      if (!isHoldButton) {
        return;
      }

      clearTimers();
      holdStartedAtRef.current = null;
      setIsHolding(false);
      setProgress(0);
    }, [clearTimers, isHoldButton]);

    const beginHold = React.useCallback(() => {
      if (!isHoldButton || disabled || isHolding || !onHoldComplete) {
        return;
      }

      const startedAt = Date.now();
      holdStartedAtRef.current = startedAt;
      setIsHolding(true);
      setProgress(0);

      progressIntervalRef.current = window.setInterval(() => {
        if (holdStartedAtRef.current === null) {
          return;
        }

        const elapsedMs = Date.now() - holdStartedAtRef.current;
        setProgress(Math.min(1, elapsedMs / durationMs));
      }, 40);

      holdTimeoutRef.current = window.setTimeout(() => {
        clearTimers();
        holdStartedAtRef.current = null;
        setIsHolding(false);
        setProgress(1);
        void onHoldComplete();
      }, durationMs);
    }, [clearTimers, disabled, durationMs, isHoldButton, isHolding, onHoldComplete]);

    React.useEffect(
      () => () => {
        clearTimers();
      },
      [clearTimers],
    );

    React.useEffect(() => {
      if (!isHoldButton) {
        setIsHolding(false);
        setProgress(0);
      }
    }, [isHoldButton]);

    const classes = ["btn", className].filter(Boolean).join(" ");

    return (
      <button
        className={classes}
        disabled={disabled}
        onClick={isHoldButton ? undefined : onClick}
        onContextMenu={isHoldButton ? (event) => event.preventDefault() : onContextMenu}
        onPointerCancel={(event) => {
          resetHold();
          onPointerCancel?.(event);
        }}
        onPointerDown={(event) => {
          beginHold();
          onPointerDown?.(event);
        }}
        onPointerLeave={(event) => {
          resetHold();
          onPointerLeave?.(event);
        }}
        onPointerUp={(event) => {
          resetHold();
          onPointerUp?.(event);
        }}
        ref={ref}
        type={type}
        {...props}
      >
        {isHoldButton ? (
          <span
            aria-hidden="true"
            className="btn-hold-fill"
            style={{ width: `${progress * 100}%` }}
          />
        ) : null}
        <span className="btn-label">
          {isHoldButton && isHolding && holdingLabel ? holdingLabel : children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
