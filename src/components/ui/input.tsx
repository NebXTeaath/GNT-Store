// src\components\ui\input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => { // Use ref here
    return (
      <input
        ref={ref} // Pass the ref to the input element
        type={type}
        data-slot="input"
        className={cn(
          "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          "flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1",
          // --- CHANGE HERE ---
          // Ensure base font size is >= 16px for mobile to prevent auto-zoom
          "text-base", // Default to 16px on all devices (especially mobile)
          // Apply smaller size only on medium screens and up (not on mobile)
          "md:text-sm", 
          // --- END CHANGE ---
          "shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }