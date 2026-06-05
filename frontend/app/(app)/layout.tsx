import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content — add bottom padding on mobile for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ backgroundColor: "var(--bg-app)" }}>
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
