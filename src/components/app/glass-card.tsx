import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  animatedBorder?: boolean;
}

export function GlassCard({
  animatedBorder = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-card/60 backdrop-blur-lg border border-border/40 shadow-sm",
        animatedBorder && "glass-border-animated",
        className
      )}
      {...props}
    />
  );
}
