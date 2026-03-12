import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[1.2rem] border-[3px] text-sm font-black uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[#85ff77] bg-linear-to-b from-[#8dff5b] to-[#37d91e] text-[#0b4d19] shadow-[0_7px_0_#1e9d17,0_16px_26px_-18px_rgba(0,0,0,0.48)] hover:-translate-y-0.5 hover:brightness-105",
        secondary:
          "border-[#92d3ff] bg-linear-to-b from-white to-[#dce8ff] text-[#12396f] shadow-[0_7px_0_#7baeff,0_16px_26px_-18px_rgba(0,0,0,0.38)] hover:-translate-y-0.5 hover:brightness-[1.03]",
      },
      size: {
        default: "h-10 px-4 text-[0.82rem]",
        lg: "h-12 px-5 text-[0.9rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
