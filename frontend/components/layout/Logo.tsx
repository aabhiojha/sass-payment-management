import { cn } from "@/lib/utils"

export function Logo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary via-primary to-[hsl(280_85%_60%)] text-primary-foreground shadow-soft">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12a9 9 0 1 1-3.46-7.1" />
          <path d="M21 4v6h-6" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-base font-semibold tracking-tight">
            PayFlow
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Billing OS
          </span>
        </div>
      )}
    </div>
  )
}
