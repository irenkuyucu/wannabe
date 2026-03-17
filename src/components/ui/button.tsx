"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 [font-size:var(--button-font-size,var(--font-size-body))]",
  {
    variants: {
      variant: {
        default:
          "border-[#85ff77] bg-linear-to-b from-[#8dff5b] to-[#37d91e] text-[#0b4d19] shadow-[0_7px_0_#1e9d17,0_16px_26px_-18px_rgba(0,0,0,0.48)] hover:-translate-y-0.5 hover:brightness-105",
        secondary:
          "border-[#92d3ff] bg-linear-to-b from-white to-[#dce8ff] text-[#12396f] shadow-[0_7px_0_#7baeff,0_16px_26px_-18px_rgba(0,0,0,0.38)] hover:-translate-y-0.5 hover:brightness-[1.03]",
        hold:
          "border-[rgba(255,255,255,0.56)] bg-linear-to-b from-[#ffe884] to-[#ffdc62] text-[#ff8b4f] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_0_rgba(205,168,67,0.38),0_18px_24px_-24px_rgba(0,0,0,0.28)]",
      },
      size: {
        default: "h-[40px] rounded-[19.2px] border-[3px] px-[16px]",
        lg: "h-[48px] rounded-[19.2px] border-[3px] px-[20px]",
        phase: "h-[82px] w-full rounded-[30px] border-[2px] px-[20px]",
      },
      interaction: {
        press: "",
        hold: "touch-none select-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interaction: "press",
    },
  },
);

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  VariantProps<typeof buttonVariants> & {
    children: React.ReactNode;
    durationMs?: number;
    holdingLabel?: string;
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
      interaction,
      onClick,
      onContextMenu,
      onHoldComplete,
      onPointerCancel,
      onPointerDown,
      onPointerLeave,
      onPointerUp,
      type = "button",
      variant,
      size,
      ...props
    },
    ref,
  ) => {
    const isHoldButton = interaction === "hold";
    const holdProgressRadiusClass =
      size === "phase" ? "rounded-[calc(30px-2px)]" : "rounded-[calc(19.2px-3px)]";
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

    return (
      <button
        className={cn(buttonVariants({ interaction, size, variant }), className)}
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
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 bg-white/28",
              holdProgressRadiusClass,
            )}
            style={{ width: `${progress * 100}%` }}
          />
        ) : null}
        <span className="relative z-10">
          {isHoldButton && isHolding && holdingLabel ? holdingLabel : children}
        </span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
