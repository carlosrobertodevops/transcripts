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
      richColors
      closeButton
    />
  )
}

export { toast }
