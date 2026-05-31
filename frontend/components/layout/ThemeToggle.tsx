"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useRef } from "react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const ref = useRef<HTMLButtonElement>(null)

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark"

    if (!document.startViewTransition) {
      setTheme(next)
      return
    }

    const rect = ref.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    document.documentElement.dataset.themeNext = next

    const vt = document.startViewTransition(() => setTheme(next))

    vt.ready.then(() => {
      const isSunrise = next === "light"

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: isSunrise ? 560 : 480,
          // Sunrise: quick burst then decelerates as light floods in
          // Eclipse: linear creep then snaps dark
          easing: isSunrise
            ? "cubic-bezier(0.0, 0.0, 0.18, 1.0)"
            : "cubic-bezier(0.4, 0.0, 0.72, 0.6)",
          pseudoElement: "::view-transition-new(root)",
          fill: "both",
        },
      )
    })

    vt.finished.then(() => {
      delete document.documentElement.dataset.themeNext
    })
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggle}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
