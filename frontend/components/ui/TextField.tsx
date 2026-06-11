"use client";

import { InputHTMLAttributes, ReactNode, useId } from "react";

/**
 * MD3 filled text field: rounded top, square bottom, 2px bottom border
 * that shifts to primary on focus. `leading` renders an icon inside the field.
 */
export default function TextField({
  label,
  leading,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; leading?: ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-md-on-surface-variant mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-md-on-surface-variant pointer-events-none">
            {leading}
          </span>
        )}
        <input
          id={id}
          className={`w-full h-12 ${leading ? "pl-11" : "pl-4"} pr-4 text-sm rounded-t-[12px] rounded-b-none bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface/50 border-0 border-b-2 border-md-outline focus:border-md-primary outline-none transition-colors duration-200`}
          {...props}
        />
      </div>
    </div>
  );
}
