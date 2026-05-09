"use client"

import { Toaster as Sonner, toast } from "sonner"
import { useTheme } from "next-themes"

export function Toaster() {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system"}
      className="toaster group"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "border shadow-lg backdrop-blur-xl",
          error:
            "!bg-destructive !text-white !border-destructive [&_[data-icon]]:text-white [&_button]:!text-white [&_[data-close-button]]:!bg-destructive [&_[data-close-button]]:!text-white [&_[data-close-button]]:!border-destructive",
          success:
            "!bg-primary !text-primary-foreground !border-primary [&_[data-icon]]:text-primary-foreground",
          warning:
            "!bg-amber-500 !text-white !border-amber-600 [&_[data-icon]]:text-white",
          info:
            "!bg-card !text-foreground !border-border",
        },
      }}
    />
  )
}

export { toast }
