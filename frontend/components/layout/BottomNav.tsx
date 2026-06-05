"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10.5651c0-.5744 0-.8616.074-1.126a2 2 0 0 1 .318-.6502c.1633-.2208.39-.3971.8434-.7498l6.7823-5.2751c.3513-.2732.527-.4099.721-.4624a1 1 0 0 1 .5226 0c.194.0525.3697.1891.721.4624l6.7823 5.2751c.4534.3527.6801.529.8434.7498.1446.1955.2524.4159.318.6502.074.2644.074.5516.074 1.126V17.8c0 1.1201 0 1.6801-.218 2.108a2 2 0 0 1-.874.874C19.4802 21 18.9201 21 17.8 21H6.2c-1.1201 0-1.6802 0-2.108-.218a2 2 0 0 1-.874-.874C3 19.4801 3 18.9201 3 17.8z" />
      </svg>
    ),
  },
  {
    label: "Customers",
    href: "/customers",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" />
      </svg>
    ),
  },
  {
    label: "Subscript...",
    href: "/subscriptions",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 10H2m0-1.8v7.6c0 1.1201 0 1.6802.218 2.108.1917.3763.4977.6823.874.874C3.5198 19 4.08 19 5.2 19h13.6c1.1201 0 1.6802 0 2.108-.218a2 2 0 0 0 .874-.874C22 17.4802 22 16.9201 22 15.8V8.2c0-1.1201 0-1.6802-.218-2.108a2 2 0 0 0-.874-.874C20.4802 5 19.9201 5 18.8 5H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 6.5198 2 7.08 2 8.2" />
      </svg>
    ),
  },
  {
    label: "More",
    href: "/products",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="22" height="22">
        <circle cx="5" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 md:hidden z-50"
      style={{ backgroundColor: "var(--primary)" }}
    >
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href === "/" && pathname === "/dashboard");
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-opacity"
            style={{ color: "white", opacity: isActive ? 1 : 0.75 }}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}

      {/* Avatar */}
      <button className="flex flex-col items-center gap-0.5 px-3 py-1">
        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-bold" style={{ color: "var(--primary)" }}>
          LT
        </div>
        <span className="text-xs font-medium text-white opacity-75">Profile</span>
      </button>
    </nav>
  );
}
