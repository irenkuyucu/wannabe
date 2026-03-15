"use client";

import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HoldButtonProps = {
  className?: string;
  durationMs?: number;
  disabled?: boolean;
  holdingLabel: string;
  idleLabel: string;
  onHoldComplete: () => void | Promise<void>;
  progressClassName?: string;
  size?: "default" | "lg";
  variant?: "default" | "secondary";
};

export function HoldButton({
  className,
  durationMs = 2000,
  disabled = false,
  holdingLabel,
  idleLabel,
  onHoldComplete,
  progressClassName,
  size = "default",
  variant = "default",
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  function clearTimers() {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function resetHold() {
    clearTimers();
    holdStartedAtRef.current = null;
    setIsHolding(false);
    setProgress(0);
  }

  function beginHold() {
    if (disabled || isHolding) {
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
  }

  useEffect(
    () => () => {
      clearTimers();
    },
    [],
  );

  return (
    <button
      className={cn(
        buttonVariants({ size, variant }),
        "relative overflow-hidden touch-none select-none",
        className,
      )}
      disabled={disabled}
      onContextMenu={(event) => event.preventDefault()}
      onPointerCancel={resetHold}
      onPointerDown={beginHold}
      onPointerLeave={resetHold}
      onPointerUp={resetHold}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 rounded-[calc(19.2px-3px)] bg-white/22",
          progressClassName,
        )}
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative z-10">{isHolding ? holdingLabel : idleLabel}</span>
    </button>
  );
}
