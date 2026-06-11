import OrganicBackdrop from "@/components/ui/OrganicBackdrop";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: "var(--bg-app)" }}>
      <OrganicBackdrop />
      <div className="relative z-10 w-full flex items-center justify-center py-10">
        {children}
      </div>
    </div>
  );
}
