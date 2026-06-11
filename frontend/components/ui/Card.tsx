"use client";

import { HTMLAttributes } from "react";

/**
 * MD3 tonal card: surface-container fill, 24px radius, no border.
 * `interactive` adds the progressive shadow + scale hover treatment.
 */
export default function Card({
  interactive = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={`rounded-xl bg-md-surface-container shadow-sm ${
        interactive
          ? "transition-all duration-300 ease-emphasized hover:shadow-md hover:scale-[1.02]"
          : ""
      } ${className}`}
      {...props}
    />
  );
}
