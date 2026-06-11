"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { HomeIcon, TenantsIcon, CustomersIcon, SubscriptionsIcon, ProductsIcon, PlansIcon, AuditIcon, ReminderIcon, UsersIcon, LogoutIcon, ShieldIcon, PayNextLogo } from "@/components/Icons";

const MIN_WIDTH = 210;
const MAX_WIDTH = 340;

// ── Nav definitions ───────────────────────────────────────────────────────────

const superAdminNav = [
  { label: "Dashboard",       href: "/admin/dashboard", icon: <HomeIcon />          },
  { label: "Tenants",         href: "/tenants",         icon: <TenantsIcon />       },
  { label: "Platform Plans",  href: "/platform-plans",  icon: <PlansIcon />         },
  { label: "Audit Log",       href: "/audit-log",       icon: <AuditIcon />         },
];

const tenantMainNav = [
  { label: "Dashboard",            href: "/dashboard",        icon: <HomeIcon />          },
  { label: "Customers",       href: "/customers",        icon: <CustomersIcon />     },
  { label: "Subscriptions",   href: "/subscriptions",    icon: <SubscriptionsIcon /> },
  { label: "Products & Plans",href: "/products",         icon: <ProductsIcon />      },
  { label: "Users",           href: "/users",            icon: <UsersIcon />         },
  { label: "Audit Log",       href: "/audit-log",        icon: <AuditIcon />         },
];

const tenantBottomNav = [
  { label: "Reminder Engine", href: "/reminder-engine", icon: <ReminderIcon />      },
];

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
}: {
  item: { label: string; href: string; icon: React.ReactNode };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className="flex items-center gap-3 px-3 py-2 rounded-full text-sm font-medium mb-0.5 transition-all duration-300 ease-emphasized hover:bg-md-primary/10 active:scale-95"
      style={
        isActive
          ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
          : { color: "#49454F" }
      }
    >
      <span style={{ color: isActive ? "var(--nav-active-text)" : "#49454F" }}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [width, setWidth] = useState(224);
  const dragging = useRef(false);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const isAdmin = user?.role === "SUPER_ADMIN";
  const mainNav = isAdmin ? superAdminNav : tenantMainNav;

  useEffect(() => {
    const apply = () => {
      const visible = window.matchMedia("(min-width: 768px)").matches;
      document.documentElement.style.setProperty("--sidebar-w", visible ? `${width}px` : "0px");
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [width]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside
      className="flex-shrink-0 h-full flex flex-col relative"
      style={{ width, backgroundColor: "var(--bg-card)" }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-0 w-1 h-full z-10 cursor-col-resize transition-colors hover:bg-md-primary/20"
        style={{ marginRight: "-1px" }}
      />

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <PayNextLogo size={30} color="var(--primary)" />
          <span className="font-bold text-xl text-gray-900">PayNext</span>
        </div>
      </div>

      {/* Role context banner for super admin */}
      {isAdmin && (
        <div className="mx-3 mb-2 px-3 py-1.5 rounded-full flex items-center gap-2 bg-md-secondary-container">
          <ShieldIcon size={13} color="#1D192B" />
          <span className="text-xs font-medium text-md-on-secondary-container">Platform Super Admin</span>
        </div>
      )}

      {/* Main Nav */}
      <nav className="px-3 py-1 space-y-0.5">
        {mainNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/") ||
            (item.href === "/admin/dashboard" && (pathname === "/" || pathname === "/admin/dashboard"));
          return <NavLink key={item.href} item={item} isActive={isActive} />;
        })}
      </nav>

      {/* Bottom secondary nav (tenant only) */}
      {!isAdmin && (
        <div className="px-3 pt-3 pb-1">
          <div className="mb-2" style={{ borderTop: "1px solid var(--border)" }} />
          {tenantBottomNav.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Profile link */}
      <div className="px-3 pb-1">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-full transition-all duration-300 ease-emphasized hover:bg-md-primary/10 active:scale-95 group"
          style={pathname === "/profile" ? { backgroundColor: "var(--nav-active)" } : {}}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {user?.fullName
              ? user.fullName.trim().split(" ").filter(Boolean).length >= 2
                ? (user.fullName.trim().split(" ")[0][0] + user.fullName.trim().split(" ").filter(Boolean).slice(-1)[0][0]).toUpperCase()
                : user.fullName.trim().slice(0, 2).toUpperCase()
              : user?.email?.slice(0, 2).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold truncate leading-tight"
              style={pathname === "/profile" ? { color: "var(--nav-active-text)" } : { color: "#1C1B1F" }}
            >
              {user?.fullName || user?.email?.split("@")[0] || "My profile"}
            </p>
            <p className="text-[10px] text-gray-400 truncate leading-tight">{user?.email}</p>
          </div>
        </Link>
      </div>

      {/* Sign out */}
      <div className="px-3 pb-3 pt-0.5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-md-error-container hover:text-md-error transition-all duration-300 ease-emphasized active:scale-95"
          title="Sign out"
        >
          <LogoutIcon size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
