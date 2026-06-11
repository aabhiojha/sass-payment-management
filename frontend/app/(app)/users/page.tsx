"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import SlideOver, { SlideOverField } from "@/components/SlideOver";
import Dialog from "@/components/Dialog";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

// ─── Types ────────────────────────────────────────────────────────────────────

type TenantUser = {
  id: number;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type InvitationItem = {
  id: number;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type Tab = "users" | "invitations";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

const ROLE_COLOR: Record<string, string> = {
  TENANT_ADMIN: "var(--primary)",
  TENANT_USER: "#6b7280",
  SUPER_ADMIN: "#7c3aed",
};

const ROLE_BG: Record<string, string> = {
  TENANT_ADMIN: "#dbeafe",
  TENANT_USER: "#f3f4f6",
  SUPER_ADMIN: "#ede9fe",
};

const ROLE_TEXT_COLOR: Record<string, string> = {
  TENANT_ADMIN: "#1d4ed8",
  TENANT_USER: "#374151",
  SUPER_ADMIN: "#7c3aed",
};

const STATUS_BG: Record<string, string> = {
  ACTIVE: "#dcfce7",
  INACTIVE: "#f3f4f6",
  SUSPENDED: "#fee2e2",
  DISABLED: "#fee2e2",
};

const STATUS_TEXT: Record<string, string> = {
  ACTIVE: "#166534",
  INACTIVE: "#6b7280",
  SUSPENDED: "#991b1b",
  DISABLED: "#991b1b",
};

const INV_STATUS_COLOR: Record<string, string> = {
  PENDING: "#e8a020",
  ACCEPTED: "#24A37D",
  REVOKED: "#6b7280",
  EXPIRED: "#ef4444",
};

function roleBadge(role: string) {
  const label = role.replace("TENANT_", "");
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: ROLE_BG[role] ?? "#f3f4f6", color: ROLE_TEXT_COLOR[role] ?? "#374151" }}
    >
      {label.charAt(0) + label.slice(1).toLowerCase()}
    </span>
  );
}

function statusBadge(status: string) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: STATUS_BG[status] ?? "#f3f4f6", color: STATUS_TEXT[status] ?? "#6b7280" }}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function Avatar({ name, email, role }: { name: string | null; email: string; role: string }) {
  const letter = (name ?? email).charAt(0).toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
      style={{ backgroundColor: ROLE_COLOR[role] ?? "#6b7280" }}
    >
      {letter}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAdmin = user?.role === "TENANT_ADMIN";
  const tid = user?.tenantId;

  const [tab, setTab] = useState<Tab>("users");

  // ── Users list ───────────────────────────────────────────────────────────
  const [users, setUsers]             = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersPage, setUsersPage]     = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotal, setUsersTotal]   = useState(0);
  const [selected, setSelected]       = useState<TenantUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing]           = useState(false);

  // ── Invitations list ─────────────────────────────────────────────────────
  const [invitations, setInvitations]         = useState<InvitationItem[]>([]);
  const [invLoading, setInvLoading]           = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteRole, setInviteRole]           = useState<"user" | "admin">("user");
  const [inviteEmail, setInviteEmail]         = useState("");
  const [inviting, setInviting]               = useState(false);
  const [inviteError, setInviteError]         = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess]     = useState<string | null>(null);

  // ── Loaders ──────────────────────────────────────────────────────────────

  const loadUsers = useCallback((p = 0) => {
    if (!token || !tid) return;
    setUsersLoading(true);
    apiGet<{ content: TenantUser[]; page: { totalElements: number; totalPages: number } }>(
      `/api/v1/tenants/${tid}/users?size=${PAGE_SIZE}&page=${p}&sort=createdAt,desc`, token
    )
      .then((d) => {
        setUsers(d.content);
        setUsersTotal(d.page.totalElements);
        setUsersTotalPages(d.page.totalPages);
        setUsersPage(p);
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, [token, tid]);

  const loadInvitations = useCallback(() => {
    if (!token || !tid) return;
    setInvLoading(true);
    apiGet<{ content: InvitationItem[] }>(`/api/v1/tenants/${tid}/invitations?size=100&sort=createdAt,desc`, token)
      .then((d) => setInvitations(d.content))
      .catch(() => {})
      .finally(() => setInvLoading(false));
  }, [token, tid]);

  useEffect(() => { loadUsers(); if (isAdmin) loadInvitations(); }, [loadUsers, loadInvitations, isAdmin]);

  // ── User actions ──────────────────────────────────────────────────────────

  const changeRole = async (u: TenantUser) => {
    if (!token || !tid) return;
    const newRole = u.role === "TENANT_ADMIN" ? "TENANT_USER" : "TENANT_ADMIN";
    setActing(true); setActionError(null);
    try {
      const updated = await apiPatch<TenantUser>(
        `/api/v1/tenants/${tid}/users/${u.id}`,
        { role: newRole },
        token
      );
      setSelected(updated);
      loadUsers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to change role.");
    } finally {
      setActing(false);
    }
  };

  const disableUser = async (u: TenantUser) => {
    if (!token || !tid) return;
    setActing(true); setActionError(null);
    try {
      await apiPost(`/api/v1/tenants/${tid}/users/${u.id}/disable`, {}, token);
      const refreshed = await apiGet<TenantUser>(`/api/v1/tenants/${tid}/users/${u.id}`, token);
      setSelected(refreshed);
      loadUsers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to disable user.");
    } finally {
      setActing(false);
    }
  };

  const deleteUser = async (u: TenantUser) => {
    if (!token || !tid) return;
    if (!confirm(`Remove ${u.fullName ?? u.email} from this tenant? This cannot be undone.`)) return;
    setActing(true); setActionError(null);
    try {
      await apiDelete(`/api/v1/tenants/${tid}/users/${u.id}`, token);
      setSelected(null);
      loadUsers();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to remove user.");
    } finally {
      setActing(false);
    }
  };

  // ── Invitation actions ────────────────────────────────────────────────────

  const sendInvite = async () => {
    if (!token || !tid || !inviteEmail.trim()) return;
    setInviting(true); setInviteError(null); setInviteSuccess(null);
    try {
      const endpoint = inviteRole === "admin" ? "invite-admin" : "invite-user";
      await apiPost(`/api/v1/tenants/${tid}/${endpoint}`, { email: inviteEmail.trim() }, token);
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      loadInvitations();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  const revokeInvitation = async (id: number) => {
    if (!token || !tid) return;
    try {
      await apiPost(`/api/v1/tenants/${tid}/invitations/${id}/revoke`, {}, token);
      loadInvitations();
    } catch { /* ignore */ }
  };

  const resendInvitation = async (id: number) => {
    if (!token || !tid) return;
    try {
      await apiPost(`/api/v1/tenants/${tid}/invitations/${id}/resend`, {}, token);
      loadInvitations();
    } catch { /* ignore */ }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const totalUsers  = usersTotal || users.length;
  const adminCount  = users.filter((u) => u.role === "TENANT_ADMIN").length;
  const memberCount = users.filter((u) => u.role === "TENANT_USER").length;
  const disabledCount = users.filter((u) => u.status !== "ACTIVE").length;
  const pendingInvites = invitations.filter((i) => i.status === "PENDING").length;

  const stats = [
    { label: "Total",    value: totalUsers    },
    { label: "Admins",   value: adminCount    },
    { label: "Members",  value: memberCount   },
    { label: "Inactive", value: disabledCount },
  ];

  return (
    <>
      <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto space-y-6 min-h-full flex flex-col" style={{ animation: "fade-in-up 0.2s ease-out both" }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">{totalUsers.toLocaleString()} member{totalUsers !== 1 ? "s" : ""}{isAdmin && pendingInvites > 0 ? ` · ${pendingInvites} pending invite${pendingInvites !== 1 ? "s" : ""}` : ""}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setInviteEmail(""); setInviteError(null); setInviteSuccess(null); setInviteDialogOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white active:scale-95"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Invite
            </button>
          )}
        </div>
        

        {/* Tabs — invitations tab is admin-only */}
        {isAdmin && (
          <div className="flex items-center gap-1 p-1 rounded-lg self-start" style={{ backgroundColor: "var(--border)" }}>
            {(["users", "invitations"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-300 ease-emphasized active:scale-95 capitalize"
                style={tab === t
                  ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
                  : { color: "#6b7280" }}
              >
                {t === "invitations" ? `Invitations${pendingInvites > 0 ? ` (${pendingInvites})` : ""}` : "Users"}
              </button>
            ))}
          </div>
        )}

        {/* ── Users tab ─────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <div className="flex-1 min-h-0 flex flex-col">
          {usersLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Loading…
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 rounded-xl" style={{ border: "1px dashed var(--border)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
                <path d="M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" />
              </svg>
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col" style={{ border: "1px solid var(--border)" }}>
                <div className="overflow-auto flex-1 min-h-0">
                  <table className="w-full text-sm min-w-[540px]">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {["User", "Role", "Status", "Joined", ""].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap" style={{ backgroundColor: "var(--bg-card)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr
                          key={u.id}
                          className="group cursor-pointer hover:bg-md-primary/5 transition-colors"
                          style={{ borderTop: "1px solid var(--border)", backgroundColor: selected?.id === u.id ? "var(--nav-active)" : "var(--bg-app)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                          onClick={() => { setSelected(u); setActionError(null); }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.fullName} email={u.email} role={u.role} />
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">{u.fullName ?? <span className="text-gray-400 italic">No name</span>}</p>
                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{roleBadge(u.role)}</td>
                          <td className="px-4 py-3">{statusBadge(u.status)}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelected(u); setActionError(null); }}
                              className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Pagination
                page={usersPage}
                totalPages={usersTotalPages}
                totalElements={usersTotal}
                pageSize={PAGE_SIZE}
                onChange={(p) => loadUsers(p)}
              />
            </>
          )}
          </div>
        )}

        {/* ── Invitations tab ───────────────────────────────────────────────── */}
        {tab === "invitations" && (
          invLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Loading…
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 rounded-xl" style={{ border: "1px dashed var(--border)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
                <path d="M21.5 18h-19m19 0-3-9H5.5l-3 9m19 0H2.5M9 9V7a3 3 0 0 1 6 0v2" />
              </svg>
              <p className="text-sm">No invitations yet.</p>
              {isAdmin && (
                <button
                  onClick={() => { setInviteEmail(""); setInviteError(null); setInviteSuccess(null); setInviteDialogOpen(true); }}
                  className="mt-3 text-sm font-medium px-4 py-2 rounded-full text-white active:scale-95"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  Send first invite
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-card)" }}>
                      {["Email", "Role", "Status", "Sent", "Expires", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv, i) => {
                      const isPending = inv.status === "PENDING";
                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-md-primary/5 transition-colors"
                          style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-app)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{inv.email}</td>
                          <td className="px-4 py-3">{roleBadge(inv.role)}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold" style={{ color: INV_STATUS_COLOR[inv.status] ?? "#6b7280" }}>
                              {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(inv.createdAt)}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(inv.expiresAt)}</td>
                          <td className="px-4 py-3">
                            {isPending && isAdmin && (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => resendInvitation(inv.id)}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
                                  style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                                >
                                  Resend
                                </button>
                                <button
                                  onClick={() => revokeInvitation(inv.id)}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-md transition-colors hover:bg-red-50"
                                  style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                                >
                                  Revoke
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── User detail slide-over ─────────────────────────────────────────── */}
      <SlideOver open={!!selected} onClose={() => { setSelected(null); setActionError(null); }} width="44vw">
        {selected && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-app)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={selected.fullName} email={selected.email} role={selected.role} />
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 leading-snug truncate">
                      {selected.fullName ?? <span className="text-gray-400 italic font-normal">No name</span>}
                    </h2>
                    <p className="text-sm text-gray-500 truncate">{selected.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelected(null); setActionError(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {roleBadge(selected.role)}
                {statusBadge(selected.status)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ animation: "slide-in-from-right 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both" }}>
              {/* Detail fields */}
              <div className="px-6 py-2">
                <SlideOverField label="Email">{selected.email}</SlideOverField>
                <SlideOverField label="Role">{selected.role.replace("TENANT_", "").charAt(0) + selected.role.replace("TENANT_", "").slice(1).toLowerCase()}</SlideOverField>
                <SlideOverField label="Status">{selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}</SlideOverField>
                <SlideOverField label="Joined">{formatDateTime(selected.createdAt)}</SlideOverField>
              </div>

              {/* Admin actions */}
              {isAdmin && selected.id !== user?.id && (
                <div className="px-6 pb-5 pt-2 space-y-3">
                  {actionError && (
                    <p className="text-sm text-red-600">{actionError}</p>
                  )}

                  {/* Role toggle */}
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => changeRole(selected)}
                      disabled={acting}
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white active:scale-95 disabled:opacity-60"
                      style={{ backgroundColor: "var(--primary)" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      {selected.role === "TENANT_ADMIN" ? "Demote to User" : "Promote to Admin"}
                    </button>

                    {selected.status === "ACTIVE" && (
                      <button
                        onClick={() => disableUser(selected)}
                        disabled={acting}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium disabled:opacity-60 active:scale-95 transition-all duration-300 ease-emphasized"
                        style={{ color: "#854d0e", border: "1px solid #fde68a" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
                        </svg>
                        Disable
                      </button>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteUser(selected)}
                    disabled={acting}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-md-error hover:bg-md-error-container active:scale-95 transition-all duration-300 ease-emphasized disabled:opacity-60"
                    style={{ border: "1px solid #fecaca" }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Remove from tenant
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </SlideOver>

      {/* ── Invite dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => { setInviteDialogOpen(false); setInviteSuccess(null); setInviteError(null); }}
        title="Invite member"
        width="400px"
        footer={
          <>
            <button
              onClick={() => { setInviteDialogOpen(false); setInviteSuccess(null); setInviteError(null); }}
              className="flex-1 py-2.5 text-sm font-medium rounded-full text-gray-600 hover:bg-md-primary/5 active:scale-95 transition-all duration-300 ease-emphasized"
              style={{ border: "1px solid var(--border)" }}
            >
              {inviteSuccess ? "Close" : "Cancel"}
            </button>
            {!inviteSuccess && (
              <button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="flex-1 py-2.5 text-sm font-medium rounded-full text-white active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {inviting && (
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                Send invite
              </button>
            )}
          </>
        }
      >
        {inviteSuccess ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: "#dcfce7" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-900">Invite sent!</p>
            <p className="text-sm text-gray-500 mt-1">{inviteSuccess}</p>
            <button
              onClick={() => { setInviteSuccess(null); setInviteEmail(""); }}
              className="mt-4 text-sm font-medium px-4 py-1.5 rounded-full active:scale-95"
              style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
            >
              Invite another
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Role picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role</label>
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--border)" }}>
                {(["user", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className="flex-1 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ease-emphasized active:scale-95 capitalize"
                    style={inviteRole === r
                      ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
                      : { color: "#6b7280" }}
                  >
                    {r === "admin" ? "Admin" : "Member"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {inviteRole === "admin"
                  ? "Admins can manage users, products, and billing."
                  : "Members can view data and manage customers and subscriptions."}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email address *</label>
              <input
                type="email"
                autoFocus
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                placeholder="colleague@company.com"
                className="w-full text-sm px-4 h-12 rounded-t-[12px] rounded-b-none outline-none transition-colors duration-200"
                style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
              />
            </div>

            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
          </div>
        )}
      </Dialog>
    </>
  );
}
