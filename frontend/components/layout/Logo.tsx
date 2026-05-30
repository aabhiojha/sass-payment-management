import Image from "next/image"
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
      <Image
        src="/favicon-96x96.png"
        alt="PayNest"
        width={32}
        height={32}
        className="shrink-0"
        priority
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-base font-semibold tracking-tight">
            PayNest
          </span>
        </div>
      )}
    </div>
  )
}
