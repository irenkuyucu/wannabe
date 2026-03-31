"use client";

import * as React from "react";

type FieldInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  embedded?: boolean;
};

const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  ({ className, embedded = false, ...props }, ref) => {
    const classes = [embedded ? "field-shell-input" : "field-input", className]
      .filter(Boolean)
      .join(" ");

    return <input className={classes} ref={ref} {...props} />;
  },
);
FieldInput.displayName = "FieldInput";

type FieldShellProps = React.HTMLAttributes<HTMLDivElement>;

function FieldShell({ className, ...props }: FieldShellProps) {
  const classes = ["field-shell", className].filter(Boolean).join(" ");
  return <div className={classes} {...props} />;
}

type FieldActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const FieldActionButton = React.forwardRef<HTMLButtonElement, FieldActionButtonProps>(
  ({ className, ...props }, ref) => {
    const classes = ["field-trailing-action", className].filter(Boolean).join(" ");

    return <button className={classes} ref={ref} {...props} />;
  },
);
FieldActionButton.displayName = "FieldActionButton";

export { FieldActionButton, FieldInput, FieldShell };
