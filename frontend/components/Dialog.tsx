"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = "420px",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"entering" | "leaving" | "hidden">("hidden");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const everOpened = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (open) {
      setPhase("entering");
      everOpened.current = true;
    } else if (everOpened.current) {
      setPhase("leaving");
      timer.current = setTimeout(() => setPhase("hidden"), 180);
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

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          backgroundColor: "rgba(0,0,0,0.32)",
          backdropFilter: "blur(4px)",
          animation: entering ? "fade-in 0.15s ease both" : "fade-out 0.18s ease both",
          pointerEvents: entering ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="flex flex-col w-full rounded-2xl overflow-hidden"
          style={{
            maxWidth: `min(${width}, calc(100vw - 2rem))`,
            backgroundColor: "#fff",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            pointerEvents: "auto",
            animation: entering
              ? "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both"
              : "dialog-out 0.15s ease-in both",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors -mr-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 180px)" }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
