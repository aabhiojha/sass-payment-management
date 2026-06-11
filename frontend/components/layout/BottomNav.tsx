"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const tenantItems = [
  {
    label: "Home",
    href: "/dashboard",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498l6.7823-5.2751c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502.074.2644.074.5516.074 1.126V17.8c0 1.1201 0 1.6801-.218 2.108a2 2 0 0 1-.874.874C19.4802 21 18.9201 21 17.8 21H6.2c-1.1201 0-1.6802 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.4801 3 18.9201 3 17.8z" /></svg>,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" /></svg>,
  },
  {
    label: "Subscriptions",
    href: "/subscriptions",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 10H2m0-1.8v7.6c0 1.1201 0 1.6802.218 2.108.1917.3763.4977.6823.874.874C3.5198 19 4.08 19 5.2 19h13.6c1.1201 0 1.6802 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.4802 22 16.9201 22 15.8V8.2c0-1.1201 0-1.6802-.218-2.108a2 2 0 0 0-.874-.874C20.4802 5 19.9201 5 18.8 5H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 6.5198 2 7.08 2 8.2" /></svg>,
  },
  {
    label: "More",
    href: "/products",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></svg>,
  },
];

const adminItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498l6.7823-5.2751c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502.074.2644.074.5516.074 1.126V17.8c0 1.1201 0 1.6801-.218 2.108a2 2 0 0 1-.874.874C19.4802 21 18.9201 21 17.8 21H6.2c-1.1201 0-1.6802 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.4801 3 18.9201 3 17.8z" /></svg>,
  },
  {
    label: "Tenants",
    href: "/tenants",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4m14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    label: "Plans",
    href: "/platform-plans",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  },
  {
    label: "More",
    href: "/audit-log",
    icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22"><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></svg>,
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const isAdmin = user?.role === "SUPER_ADMIN";
  const items = isAdmin ? adminItems : tenantItems;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 pt-2 md:hidden z-50 bg-md-surface-container shadow-[0_-1px_8px_rgba(28,27,31,0.08)]"
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/dashboard" && pathname === "/") ||
          (item.href === "/admin/dashboard" && pathname === "/admin/dashboard");
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-2 py-1 transition-all duration-300 ease-emphasized active:scale-95 group"
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`flex items-center justify-center px-4 py-0.5 rounded-full transition-colors duration-300 ${
                isActive ? "bg-md-secondary-container text-md-on-secondary-container" : "text-md-on-surface-variant group-hover:bg-md-primary/10"
              }`}
            >
              {item.icon}
            </span>
            <span className={`text-[10px] whitespace-nowrap ${isActive ? "font-bold text-md-on-surface" : "font-medium text-md-on-surface-variant"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-2 py-1 transition-all duration-300 ease-emphasized active:scale-95 group">
        <span className="flex items-center justify-center px-4 py-0.5 rounded-full text-md-on-surface-variant group-hover:bg-md-primary/10 transition-colors duration-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </span>
        <span className="text-[10px] font-medium text-md-on-surface-variant whitespace-nowrap">Sign out</span>
      </button>
    </nav>
  );
}
