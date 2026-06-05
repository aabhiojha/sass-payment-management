"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";

const MIN_WIDTH = 210;
const MAX_WIDTH = 340;

const mainNavItems = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498l6.7823-5.2751c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502.074.2644.074.5516.074 1.126V17.8c0 1.1201 0 1.6801-.218 2.108a2 2 0 0 1-.874.874C19.4802 21 18.9201 21 17.8 21H6.2c-1.1201 0-1.6802 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.4801 3 18.9201 3 17.8z" />
      </svg>
    ),
  },
  {
    label: "Customers",
    href: "/customers",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" />
      </svg>
    ),
  },
  {
    label: "Subscriptions",
    href: "/subscriptions",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M22 10H2m0-1.8v7.6c0 1.1201 0 1.6802.218 2.108.1917.3763.4977.6823.874.874C3.5198 19 4.08 19 5.2 19h13.6c1.1201 0 1.6802 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.4802 22 16.9201 22 15.8V8.2c0-1.1201 0-1.6802-.218-2.108a2 2 0 0 0-.874-.874C20.4802 5 19.9201 5 18.8 5H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 6.5198 2 7.08 2 8.2" />
      </svg>
    ),
  },
  {
    label: "Products & Plans",
    href: "/products",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l7.6686 7.6686c1.188 1.188 1.7821 1.7821 2.467 2.0046a3 3 0 0 0 1.8541 0c.685-.2225 1.2791-.8166 2.4671-2.0046l2.2118-2.2118c1.188-1.188 1.7821-1.7821 2.0046-2.4671a3 3 0 0 0 0-1.8541c-.2225-.6849-.8166-1.279-2.0046-2.467l-7.6686-7.6686c-.3459-.346-.5189-.5189-.7207-.6426a2 2 0 0 0-.5781-.2394C10.4083 2 10.1637 2 9.6745 2H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 3.5198 2 4.08 2 5.2M8.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
      </svg>
    ),
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="m12.7076 18.3639-1.4143 1.4142c-1.9526 1.9527-5.1184 1.9527-7.071 0-1.9526-1.9526-1.9526-5.1184 0-7.071l1.4142-1.4142m12.7279 1.4142 1.4142-1.4142c1.9526-1.9527 1.9526-5.1185 0-7.0711s-5.1184-1.9526-7.071 0L11.2933 5.636m-2.7928 9.8639 7-7" />
      </svg>
    ),
  },
];

const bottomNavItems = [
  {
    label: "Reminder Engine",
    href: "/reminder-engine",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9.3542 21c.7051.6224 1.6314 1 2.6458 1a3.984 3.984 0 0 0 2.6458-1M18 8A6 6 0 1 0 6 8c0 3.0902-.7795 5.206-1.6503 6.6054-.7346 1.1805-1.1018 1.7707-1.0884 1.9354.015.1823.0536.2518.2005.3608C3.5945 17 4.1926 17 5.3888 17h13.2224c1.1962 0 1.7944 0 1.927-.0984.147-.109.1856-.1785.2005-.3608.0135-.1647-.3538-.7549-1.0883-1.9354C18.7795 13.206 18 11.0902 18 8" />
      </svg>
    ),
  },
];

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
      className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-black:] mb-0.5 transition-colors hover:bg-[#f1eaed]"
      style={
        isActive
          ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
          : { color: "#4b4b4b" }
      }
    >
      <span style={isActive ? { color: "var(--nav-active-text)" } : { color: "#111111" }}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(224);
  const dragging = useRef(false);

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

  return (
    <aside
      className="flex-shrink-0 h-full flex flex-col relative"
      style={{ width, backgroundColor: "#fef7fa", borderRight: "1px solid var(--border)" }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-0 w-1 h-full z-10 cursor-col-resize transition-colors hover:bg-[#fbebf3]"
        style={{ marginRight: "-1px" }}
      />

      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            // style={{ backgroundColor: "var(--nav-active)"}}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="30" height="30">
              <path stroke="var(--primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 11v4m12-6v4m-1-9c2.4487 0 3.7731.3748 4.4321.6654.0878.0388.1317.0581.2583.179.0759.0724.2145.285.2501.3837.0595.1646.0595.2546.0595.4346v10.7484c0 .9088 0 1.3632-.1363 1.5968-.1386.2375-.2723.348-.5318.4393-.255.0897-.7699-.0092-1.7997-.2071A13.45 13.45 0 0 0 17 18c-3 0-6 2-10 2-2.4487 0-3.7731-.3748-4.4321-.6654-.0878-.0388-.1317-.0581-.2583-.179-.076-.0724-.2145-.285-.2501-.3837C2 18.6073 2 18.5173 2 18.3373V7.5889c0-.9088 0-1.3632.1363-1.5968.1386-.2375.2723-.348.5318-.4393.255-.0898.77.0092 1.7997.207A13.44 13.44 0 0 0 7 6c3 0 6-2 10-2m-2.5 8c0 1.3807-1.1193 2.5-2.5 2.5S9.5 13.3807 9.5 12s1.1193-2.5 2.5-2.5 2.5 1.1193 2.5 2.5" />
            </svg>
          </div>
          <span className="font-bold text-xl text-gray-900">PayNext</span>
        </div>
        <div className="flex items-center gap-2 text-gray-800">
          <button className="hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="hover:text-gray-1000 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="m11 15-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="7" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="px-3 py-1 space-y-0.5">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/" && pathname === "/dashboard");
          return <NavLink key={item.href} item={item} isActive={isActive} />;
        })}
      </nav>

      {/* Divider + Reminder Engine */}
      <div className="px-3 pt-3 pb-1">
        <div className="mb-2" style={{ borderTop: "1px solid var(--border)" }} />
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return <NavLink key={item.href} item={item} isActive={isActive} />;
        })}
      </div>

      {/* Spacer pushes user profile to bottom */}
      <div className="flex-1" />

      {/* User profile */}
      <div className="px-4 pb-5">
        <button className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-pink-50 transition-colors text-left">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            LT
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">Levi Thompson</p>
            <p className="text-xs text-gray-400 truncate hover:text-primary transition-colors">levi.thompson@...</p>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
