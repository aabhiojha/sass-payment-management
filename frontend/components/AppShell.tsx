"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

function LoadingScreen() {
  return (
    <div className="h-full flex items-center justify-center" style={{ backgroundColor: "#fef7fa" }}>
      <div className="flex flex-col items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="36" height="36">
          <path stroke="var(--primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 11v4m12-6v4m-1-9c2.4487 0 3.7731.3748 4.4321.6654.0878.0388.1317.0581.2583.179.0759.0724.2145.285.2501.3837.0595.1646.0595.2546.0595.4346v10.7484c0 .9088 0 1.3632-.1363 1.5968-.1386.2375-.2723.348-.5318.4393-.255.0897-.7699-.0092-1.7997-.2071A13.45 13.45 0 0 0 17 18c-3 0-6 2-10 2-2.4487 0-3.7731-.3748-4.4321-.6654-.0878-.0388-.1317-.0581-.2583-.179-.076-.0724-.2145-.285-.2501-.3837C2 18.6073 2 18.5173 2 18.3373V7.5889c0-.9088 0-1.3632.1363-1.5968.1386-.2375.2723-.348.5318-.4393.255-.0898.77.0092 1.7997.207A13.44 13.44 0 0 0 7 6c3 0 6-2 10-2m-2.5 8c0 1.3807-1.1193 2.5-2.5 2.5S9.5 13.3807 9.5 12s1.1193-2.5 2.5-2.5 2.5 1.1193 2.5 2.5" />
        </svg>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: "var(--primary)",
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) return <LoadingScreen />;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-full">
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>
      <main
        className="flex-1 overflow-y-auto pb-16 md:pb-0"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
