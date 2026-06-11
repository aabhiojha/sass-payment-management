"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiPost("/api/v1/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-4" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="flex items-center justify-center gap-2.5 mb-10">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="32" height="32">
          <path stroke="var(--primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 11v4m12-6v4m-1-9c2.4487 0 3.7731.3748 4.4321.6654.0878.0388.1317.0581.2583.179.0759.0724.2145.285.2501.3837.0595.1646.0595.2546.0595.4346v10.7484c0 .9088 0 1.3632-.1363 1.5968-.1386.2375-.2723.348-.5318.4393-.255.0897-.7699-.0092-1.7997-.2071A13.45 13.45 0 0 0 17 18c-3 0-6 2-10 2-2.4487 0-3.7731-.3748-4.4321-.6654-.0878-.0388-.1317-.0581-.2583-.179-.076-.0724-.2145-.285-.2501-.3837C2 18.6073 2 18.5173 2 18.3373V7.5889c0-.9088 0-1.3632.1363-1.5968.1386-.2375.2723-.348.5318-.4393.255-.0898.77.0092 1.7997.207A13.44 13.44 0 0 0 7 6c3 0 6-2 10-2m-2.5 8c0 1.3807-1.1193 2.5-2.5 2.5S9.5 13.3807 9.5 12s1.1193-2.5 2.5-2.5 2.5 1.1193 2.5 2.5" />
        </svg>
        <span className="text-2xl font-bold text-gray-900">PayNext</span>
      </div>

      <div className="rounded-2xl p-8" style={{ backgroundColor: "var(--bg-app)", boxShadow: "0 8px 40px rgba(28,27,31,0.12)" }}>
        {success ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Password reset</h1>
            <p className="text-sm text-gray-500 mb-6">Your password has been reset successfully. You can now sign in with your new password.</p>
            <Link
              href="/login"
              className="block text-center w-full py-3 text-sm font-medium rounded-full bg-md-primary text-md-on-primary hover:bg-md-primary/90 active:scale-95 transition-all duration-300 ease-emphasized"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Set new password</h1>
            <p className="text-sm text-gray-500 mb-7">Enter your new password below</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  New password
                </label>
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full text-sm pl-9 pr-4 h-12 rounded-t-[12px] rounded-b-none bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface/50 border-0 border-b-2 border-md-outline focus:border-md-primary outline-none transition-colors duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Confirm password
                </label>
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full text-sm pl-9 pr-4 h-12 rounded-t-[12px] rounded-b-none bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface/50 border-0 border-b-2 border-md-outline focus:border-md-primary outline-none transition-colors duration-200"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-md-error-container text-md-on-error-container">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full h-12 text-sm font-medium rounded-full bg-md-primary text-md-on-primary hover:bg-md-primary/90 active:bg-md-primary/80 hover:shadow-md active:scale-95 transition-all duration-300 ease-emphasized disabled:opacity-60 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Resetting…
                  </span>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-full">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
