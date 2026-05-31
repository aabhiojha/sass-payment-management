import { useEffect, useRef, useState } from "react"

export function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // ease-out-quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return count
}
