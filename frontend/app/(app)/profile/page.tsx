"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPatch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserProfile = {
  id: number;
  tenantId: number | null;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  TENANT_ADMIN: "Admin",
  TENANT_USER: "Member",
};

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  SUPER_ADMIN: { bg: "#ede9fe", color: "#7c3aed" },
  TENANT_ADMIN: { bg: "#dbeafe", color: "#1d4ed8" },
  TENANT_USER: { bg: "#f3f4f6", color: "#374151" },
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  INACTIVE:  { bg: "#f3f4f6", color: "#6b7280" },
  SUSPENDED: { bg: "#fee2e2", color: "#991b1b" },
  DISABLED:  { bg: "#fee2e2", color: "#991b1b" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function initials(name: string | null, email: string) {
  if (name?.trim()) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, token, updateUser } = useAuthStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    apiGet<UserProfile>("/api/v1/me", token)
      .then((p) => { setProfile(p); setFullName(p.fullName ?? ""); })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editing]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const updated = await apiPatch<UserProfile>("/api/v1/me", { fullName: fullName.trim() || null }, token);
      setProfile(updated);
      setFullName(updated.fullName ?? "");
      updateUser({ fullName: updated.fullName });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFullName(profile?.fullName ?? "");
    setSaveError(null);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const roleStyle = ROLE_STYLE[profile.role] ?? { bg: "#f3f4f6", color: "#374151" };
  const statusStyle = STATUS_STYLE[profile.status] ?? { bg: "#f3f4f6", color: "#374151" };
  const avatarInitials = initials(profile.fullName, profile.email);

  return (
    <div
      className="min-h-screen px-6 py-8 max-w-2xl"
      style={{ animation: "fade-in-up 0.2s ease-out both" }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">View and update your account information</p>
      </div>

      {/* Avatar + identity card */}
      <div
        className="rounded-xl p-6 mb-6 flex items-center gap-5"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {avatarInitials}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">
            {profile.fullName || <span className="text-gray-400 italic font-normal">No name set</span>}
          </p>
          <p className="text-sm text-gray-500 truncate">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}
            >
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
            >
              {profile.status.charAt(0) + profile.status.slice(1).toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div
        className="rounded-xl overflow-hidden mb-6"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold text-gray-700">Account details</h2>
        </div>

        {/* Email */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
            <p className="text-sm text-gray-900">{profile.email}</p>
          </div>
          <span className="text-xs text-gray-400 italic">read-only</span>
        </div>

        {/* Full name */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Full name</p>
              {editing ? (
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setSaveError(null); }}
                    maxLength={100}
                    placeholder="Your full name"
                    className="w-full text-sm px-4 py-2 rounded-t-[12px] rounded-b-none outline-none"
                    style={{
                      borderBottom: "2px solid var(--primary)",
                      backgroundColor: "var(--bg-search)",
                      color: "var(--foreground)",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                  />
                  {saveError && (
                    <p className="text-xs text-red-600 mt-1">{saveError}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900">
                  {profile.fullName || <span className="text-gray-400 italic">Not set</span>}
                </p>
              )}
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: "var(--primary)" }}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Role */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Role</p>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}
            >
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
          </div>
          <span className="text-xs text-gray-400 italic">read-only</span>
        </div>

        {/* Member since */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Member since</p>
            <p className="text-sm text-gray-900">{formatDate(profile.createdAt)}</p>
          </div>
        </div>

        {/* Last updated */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Last updated</p>
            <p className="text-sm text-gray-900">{formatDateTime(profile.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Success toast */}
      {saveSuccess && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#24A37D", animation: "fade-in 0.2s ease both", zIndex: 100 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Profile updated
        </div>
      )}
    </div>
  );
}
