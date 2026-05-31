"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
}

export function SearchInput({
  className,
  containerClassName,
  placeholder = "Search…",
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full max-w-sm", containerClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        {...props}
        placeholder={placeholder}
        aria-label={props["aria-label"] ?? placeholder}
        className={cn("pl-9", className)}
      />
    </div>
  )
}
