"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SlideOver({
  open,
  onClose,
  children,
  width = "50vw",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"entering" | "leaving" | "hidden">("hidden");
  const [isMobile, setIsMobile] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const everOpened = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (open) {
      setPhase("entering");
      everOpened.current = true;
    } else if (everOpened.current) {
      setPhase("leaving");
      timer.current = setTimeout(() => setPhase("hidden"), 210);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || phase === "hidden") return null;

  const entering = phase === "entering";
  const backdropAnim = entering ? "fade-in 0.2s ease both" : "fade-out 0.2s ease both";
  const panelAnim   = entering
    ? "slide-in-from-right 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both"
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
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 z-50 h-full flex flex-col overflow-hidden ${isMobile ? "" : "rounded-l-[28px]"}`}
        style={{
          width: isMobile ? "100dvw" : `min(${width}, 100vw)`,
          backgroundColor: "var(--bg-app)",
          boxShadow: "-8px 0 32px rgba(28,27,31,0.12)",
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
  actions,
  onBack,
  onClose,
}: {
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button onClick={onBack} aria-label="Back" className="flex-shrink-0 text-md-on-surface-variant hover:bg-md-primary/10 active:scale-95 transition-all duration-200 rounded-full p-1.5 -m-1.5 -ml-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 truncate">{title}</h2>
          {badge && <div className="mt-1.5">{badge}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        {actions}
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="text-md-on-surface-variant hover:bg-md-primary/10 active:scale-95 transition-all duration-200 rounded-full p-2 -m-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function SlideOverField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
      <span className="text-sm text-gray-400 flex-shrink-0 w-28 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 font-semibold flex-1 min-w-0">{children}</span>
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
