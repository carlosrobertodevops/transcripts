'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { useProximity } from "@/hooks/use-proximity"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, style, children, ...props }, ref) => {
    const { ref: proximityRef, proximity } = useProximity<HTMLDivElement>()

    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
        proximityRef.current = node
      },
      [ref, proximityRef]
    )

    return (
      <div
        ref={mergedRef}
        style={{
          ...style,
          '--glass-proximity': proximity,
        } as React.CSSProperties & { '--glass-proximity': number }}
        className={cn(
          'rounded-lg border border-border bg-card text-card-foreground shadow-sm glass-border-animated',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'
