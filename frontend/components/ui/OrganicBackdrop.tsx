"use client";

/**
 * Signature MD3 atmospheric layer: organic blurred shapes in the three
 * tonal accents, positioned partially off-canvas. Place inside a relative,
 * overflow-hidden container behind content. Purely decorative.
 */
export default function OrganicBackdrop({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-md-primary/15 blur-3xl" />
      <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-md-tertiary-container/50 blur-3xl" />
      <div className="absolute -bottom-32 left-1/4 w-[32rem] h-80 rounded-[100px] rounded-tr-[20px] bg-md-secondary-container/70 blur-3xl" />
    </div>
  );
}
