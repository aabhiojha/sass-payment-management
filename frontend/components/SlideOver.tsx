"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SlideOver({
  open,
  onClose,
  children,
  width = "480px",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"entering" | "leaving" | "hidden">("hidden");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (open) {
      setPhase("entering");
    } else {
      setPhase("leaving");
      timer.current = setTimeout(() => setPhase("hidden"), 210);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [open]);

  if (!mounted || phase === "hidden") return null;

  const entering = phase === "entering";
  const backdropAnim = entering ? "fade-in 0.2s ease both" : "fade-out 0.2s ease both";
  const panelAnim   = entering
    ? "slide-in-from-right 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both"
    : "slide-out-to-right 0.20s ease-in both";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        style={{
          backgroundColor: "rgba(0,0,0,0.18)",
          animation: backdropAnim,
          pointerEvents: entering ? "auto" : "none",
        }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 z-50 h-full flex flex-col overflow-hidden"
        style={{
          width: `min(${width}, 100vw)`,
          backgroundColor: "#fff",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
          animation: panelAnim,
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export function SlideOverHeader({
  title,
  badge,
  onClose,
}: {
  title: string;
  badge?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-gray-900 truncate">{title}</h2>
        {badge && <div className="mt-1.5">{badge}</div>}
      </div>
      <button
        onClick={onClose}
        className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function SlideOverField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
      <span className="text-sm text-gray-400 flex-shrink-0 w-28 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium flex-1 min-w-0">{children}</span>
    </div>
  );
}

export function SlideOverSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4">
      {title && <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{title}</p>}
      {children}
    </div>
  );
}
