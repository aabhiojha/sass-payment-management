"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore, type AuthUser, type UserRole } from "@/store/authStore";
import { apiGet, apiPost } from "@/lib/api";

type ValidateResponse = {
  email: string;
  role: string;
  tenantName: string;
  expiresAt: string;
};

type AcceptResponse = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  role: string;
  fullName: string | null;
  tenantId: number | null;
};

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [validating, setValidating] = useState(true);
  const [invite, setInvite] = useState<ValidateResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenError("No invite token found in the link.");
      setValidating(false);
      return;
    }
    apiGet<ValidateResponse>(`/api/v1/auth/invite/validate?token=${encodeURIComponent(token)}`)
      .then((data) => setInvite(data))
      .catch(() => setTokenError("This invite link is invalid, expired, or already used."))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiPost<AcceptResponse>("/api/v1/auth/accept-invite", {
        token,
        password,
        fullName: fullName.trim() || null,
      });
      const user: AuthUser = {
        id: res.userId,
        email: res.email,
        role: res.role as UserRole,
        fullName: res.fullName,
        tenantId: res.tenantId ?? null,
      };
      login(user, res.accessToken, res.refreshToken);
      router.replace("/dashboard");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to activate account.");
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin text-gray-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-md-error-container">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Invite link invalid</h1>
        <p className="text-sm text-gray-500 mb-6">{tokenError}</p>
        <a href="/login" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
          Back to login →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="mb-8 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--nav-active)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your account</h1>
        <p className="text-sm text-gray-500 mt-1">
          You were invited to <span className="font-semibold text-gray-700">{invite?.tenantName}</span> as{" "}
          <span className="font-semibold text-gray-700">{{ TENANT_ADMIN: "Admin", TENANT_USER: "User" }[invite?.role ?? ""] ?? invite?.role}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">{invite?.email}</p>
      </div>

      <div className="rounded-2xl p-8" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Full Name <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full text-sm px-4 h-12 rounded-t-[12px] rounded-b-none bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface/50 border-0 border-b-2 border-md-outline focus:border-md-primary outline-none transition-colors duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Password <span style={{ color: "var(--primary)" }}>*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                className="w-full text-sm px-4 pr-10 h-12 rounded-t-[12px] rounded-b-none bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface/50 border-0 border-b-2 border-md-outline focus:border-md-primary outline-none transition-colors duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
          </div>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full h-12 text-sm font-medium rounded-full bg-md-primary text-md-on-primary hover:bg-md-primary/90 active:bg-md-primary/80 hover:shadow-md active:scale-95 transition-all duration-300 ease-emphasized disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            Activate Account
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Already have an account?{" "}
        <a href="/login" className="font-semibold" style={{ color: "var(--primary)" }}>Sign in</a>
      </p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  );
}
