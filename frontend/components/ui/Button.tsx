"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "filled" | "tonal" | "outlined" | "text" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  filled:   "bg-md-primary text-md-on-primary hover:bg-md-primary/90 active:bg-md-primary/80 hover:shadow-md",
  tonal:    "bg-md-secondary-container text-md-on-secondary-container hover:bg-md-secondary-container/80 active:bg-md-secondary-container/70 hover:shadow-sm",
  outlined: "border border-md-outline text-md-primary hover:bg-md-primary/5 active:bg-md-primary/10",
  text:     "text-md-primary hover:bg-md-primary/10 active:bg-md-primary/5",
  danger:   "bg-md-error text-white hover:bg-md-error/90 active:bg-md-error/80 hover:shadow-md",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-10 px-6 text-sm",
  lg: "h-12 px-8 text-sm",
};

export default function Button({
  variant = "filled",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-all duration-300 ease-emphasized active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  );
}
