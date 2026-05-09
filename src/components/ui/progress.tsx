"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | null;
  indeterminate?: boolean;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, indeterminate, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, value ?? 0));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : pct}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full bg-primary transition-all duration-300",
            indeterminate && "animate-pulse",
          )}
          style={{
            width: indeterminate ? "100%" : `${pct}%`,
            backgroundImage: indeterminate
              ? "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--primary) 80%, transparent) 50%, transparent 100%)"
              : undefined,
            backgroundSize: indeterminate ? "200% 100%" : undefined,
            animation: indeterminate ? "shimmer-sweep 1.5s linear infinite" : undefined,
          }}
        />
      </div>
    );
  },
);

Progress.displayName = "Progress";
